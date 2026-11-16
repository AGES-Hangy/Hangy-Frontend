const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function load(file, imports, globals = {}) {
  const context = { exports: {}, require: id => {
    assert.ok(id in imports, `Unexpected import ${id}`);
    return imports[id];
  }, ...globals };
  vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  }), context);
  return context.exports;
}
const { endpoints } = load('src/constants/api.ts', {}, { process: { env: {} }, __DEV__: false, URLSearchParams });

// Run the actual hooks with controlled HTTP promises and timers, as in block-state.test.cjs.
function host(apiFetch, hook = 'useSearchPeople') {
  const slots = [], effects = [];
  let cursor = 0, focus, activeFocus;
  const toasts = [];
  const addToast = toast => toasts.push(toast);
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) slots[i] = { fn, deps };
      return slots[i].fn;
    },
  };
  const imports = {
    react,
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '@/constants/api': { endpoints },
    '@/hooks/useSearch': { MIN_SEARCH_QUERY_LENGTH: 2 },
    '@/utils/http': { apiFetch },
    '@/utils/apiErrors': {
      describeLoadError: error => ({
        kind: error?.kind === 'timeout' ? 'timeout' : 'server',
        message: error?.kind === 'timeout' ? 'A conexão demorou demais' : 'Falha na busca',
        canRetry: true,
      }),
      describeActionError: () => ({ message: 'Falha na conexão', tone: 'error' }),
      isApiErrorLike: error => typeof error?.status === 'number',
    },
    '@/components/Toast': { useToast: () => ({ addToast }) },
  };
  if (hook === 'useSearchPeople') {
    imports['@/hooks/useConnectionActions'] = load('src/hooks/useConnectionActions.ts', imports);
  }
  const exports = load(`src/hooks/${hook}.ts`, imports, { console: { warn() {} } });
  return {
    toasts,
    render(query = '') {
      cursor = 0;
      const result = exports[hook](query);
      if (focus && focus !== activeFocus) {
        effects.pop()?.();
        effects.push(focus());
        activeFocus = focus;
      }
      return result;
    },
    blur() { effects.pop()?.(); activeFocus = undefined; },
  };
}
const response = (ids, next_cursor = null, total = ids.length) => ({
  items: ids.map(user_id => ({ user_id, name: user_id, connection_status: null })),
  next_cursor,
  total,
});

test('people endpoint encodes the term and opaque cursor', () => {
  const initial = endpoints.searchUsers({ q: 'Ana & João', limit: 20, cursor: null });
  const next = endpoints.searchUsers({ q: 'Ana & João', limit: 20, cursor: 'ab+/=' });
  const url = new URL(next, 'https://hangy.test');
  assert.equal(url.pathname, '/search/users');
  assert.equal(url.searchParams.get('q'), 'Ana & João');
  assert.equal(url.searchParams.get('limit'), '20');
  assert.equal(url.searchParams.get('cursor'), 'ab+/=');
  assert.equal(new URL(initial, url).searchParams.has('cursor'), false);
});

test('short searches skip HTTP and a valid empty response finishes the load', async () => {
  const calls = [];
  const h = host(async url => { calls.push(url); return response([]); });
  h.render(' ');
  h.render('a');
  h.render('🚀');
  assert.equal(calls.length, 0);
  h.render(' Ana ');
  await flush();
  const state = h.render(' Ana ');
  assert.deepEqual(calls, ['/search/users?q=Ana&limit=20']);
  assert.equal(state.total, 0);
  assert.equal(state.isLoading, false);
  assert.equal(state.people.length, 0);
});

test('next page is loaded once, preserves rows, appends unique people, and stops at the final cursor', async () => {
  const calls = [];
  const next = deferred();
  const h = host(url => {
    calls.push(url);
    return calls.length === 1 ? Promise.resolve(response(['ana'], 'next', 2)) : next.promise;
  });
  h.render('Ana');
  await flush();
  const state = h.render('Ana');
  state.loadMore();
  state.loadMore();
  assert.equal(h.render('Ana').isLoadingMore, true);
  assert.equal(h.render('Ana').people[0].user_id, 'ana');
  assert.deepEqual(calls, ['/search/users?q=Ana&limit=20', '/search/users?q=Ana&limit=20&cursor=next']);
  next.resolve(response(['ana', 'ana-lima'], null, 2));
  await flush();
  const last = h.render('Ana');
  assert.deepEqual(Array.from(last.people, person => person.user_id), ['ana', 'ana-lima']);
  assert.equal(last.total, 2);
  assert.equal(last.hasMore, false);
  last.loadMore();
  assert.equal(calls.length, 2);
});

test('late responses from another search or a previous visit are discarded', async () => {
  const requests = [];
  const h = host(() => { const request = deferred(); requests.push(request); return request.promise; });
  h.render('Ana');
  assert.equal(h.render('Bruno').people.length, 0);
  h.blur();
  h.render('Bruno');
  requests[2].resolve(response(['bruno-new']));
  requests[1].resolve(response(['bruno-old']));
  requests[0].resolve(response(['ana']));
  await flush();
  assert.equal(h.render('Bruno').people[0].user_id, 'bruno-new');
});

test('a failed next page pauses autoplay and retries the same cursor with rows intact', async () => {
  const calls = [];
  const h = host(async url => {
    calls.push(url);
    if (calls.length === 1) return response(['ana'], 'next', 2);
    if (calls.length === 2) throw { kind: 'timeout' };
    return response(['ana-lima'], null, 2);
  });
  h.render('Ana');
  await flush();
  h.render('Ana').loadMore();
  await flush();
  const failed = h.render('Ana');
  assert.equal(failed.error.kind, 'timeout');
  assert.equal(failed.people[0].user_id, 'ana');
  failed.loadMore();
  assert.equal(calls.length, 2);
  assert.equal(h.toasts[0].actionLabel, 'Tentar de novo');
  h.toasts[0].onAction();
  await flush();
  assert.equal(calls[1], calls[2]);
  assert.equal(h.render('Ana').people.length, 2);
});

test('invalid pagination keeps the loaded rows and stops further requests', async () => {
  let calls = 0;
  const h = host(async () => {
    if (++calls === 1) return response(['ana'], 'next', 2);
    throw { status: 400, detail: 'Invalid pagination parameters' };
  });
  h.render('Ana');
  await flush();
  h.render('Ana').loadMore();
  await flush();
  const failed = h.render('Ana');
  assert.equal(failed.error.canRetry, false);
  assert.equal(failed.hasMore, false);
  assert.equal(failed.people[0].user_id, 'ana');
  assert.equal(h.toasts[0].type, 'error');
  failed.loadMore();
  failed.retry();
  assert.equal(calls, 2);
});

test('401 leaves the session message to the shared HTTP client', async () => {
  const h = host(async () => { throw { status: 401 }; });
  h.render('Ana');
  await flush();
  assert.equal(h.render('Ana').error, null);
  assert.equal(h.toasts.length, 0);
});

test('connecting in the list sends once and marks only the selected person pending during pagination', async () => {
  const post = deferred(), next = deferred();
  const writes = [];
  const h = host((url, init) => {
    if (init?.method === 'POST') {
      writes.push({ url, body: JSON.parse(init.body) });
      return post.promise;
    }
    return url.includes('cursor=') ? next.promise : Promise.resolve(response(['ana', 'ana-lima'], 'next', 3));
  });
  h.render('Ana');
  await flush();
  const list = h.render('Ana');
  const sent = list.connectPerson('ana');
  await list.connectPerson('ana');
  assert.equal(h.render('Ana').connectingId, 'ana');
  list.loadMore();
  assert.deepEqual(writes, [{ url: '/connections', body: { receiver_id: 'ana' } }]);

  post.resolve({ connection_id: 'connection-id' });
  await sent;
  next.resolve(response(['ana-silva'], null, 3));
  await flush();
  const updated = h.render('Ana');
  assert.equal(updated.connectingId, null);
  assert.deepEqual(Array.from(updated.people, person => [person.user_id, person.connection_status]), [
    ['ana', 'PENDING'], ['ana-lima', null], ['ana-silva', null],
  ]);
  await updated.connectPerson('ana');
  assert.equal(writes.length, 1);
  assert.equal(h.toasts[0].type, 'success');
});

test('a conflict refreshes the relationship and discards an older page in flight', async () => {
  const next = deferred();
  let firstPageCount = 0;
  const h = host(async (url, init) => {
    if (init?.method === 'POST') throw { status: 409 };
    if (url.includes('cursor=')) return next.promise;
    if (++firstPageCount === 1) return response(['ana'], 'next', 2);
    const refreshed = response(['ana']);
    refreshed.items[0].connection_status = 'CONFIRMED';
    return refreshed;
  });
  h.render('Ana');
  await flush();
  const list = h.render('Ana');
  list.loadMore();
  await list.connectPerson('ana');
  next.resolve(response(['stale']));
  await flush();

  const updated = h.render('Ana');
  assert.equal(firstPageCount, 2);
  assert.equal(updated.people.length, 1);
  assert.equal(updated.people[0].connection_status, 'CONFIRMED');
});

test('connect sends receiver_id once on rapid double tap and preserves conflict as a distinct result', async () => {
  const request = deferred(), calls = [];
  const h = host((url, init) => { calls.push({ url, init }); return request.promise; }, 'useConnectionActions');
  const state = h.render();
  const first = state.connect('person-id');
  assert.equal((await state.connect('person-id')).kind, 'ignored');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/connections');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { receiver_id: 'person-id' });
  request.resolve({ connection_id: 'connection-id' });
  assert.equal((await first).kind, 'sent');
  assert.equal(h.render().isLoading, false);
  const conflict = host(async () => { throw { status: 409 }; }, 'useConnectionActions');
  assert.equal((await conflict.render().connect('person-id')).kind, 'conflict');
});
