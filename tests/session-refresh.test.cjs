const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const tick = () => new Promise((resolve) => setImmediate(resolve));

function json(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

/** Carrega `src/utils/http.ts` com o armazenamento e o `fetch` simulados. */
function client({ routes, refreshToken = 'refresh-1' }) {
  const store = { token: 'access-1', refresh: refreshToken };
  const calls = [];
  const redirects = [];
  const ended = [];
  const exports = {};
  const fetch = async (url, init = {}) => {
    const pathName = url.replace('http://test', '');
    calls.push({ path: pathName, init });
    if (init.signal?.aborted) {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }
    return routes(pathName, init, store);
  };
  vm.runInNewContext(
    ts.transpile(fs.readFileSync(path.join(__dirname, '../src/utils/http.ts'), 'utf8'), {
      module: ts.ModuleKind.CommonJS,
    }),
    {
      exports, fetch, setTimeout, clearTimeout, AbortController,
      require: (name) => {
        if (name === 'react-native') return { Platform: { OS: 'web' } };
        if (name === 'expo-router') return { router: { replace: (to) => redirects.push(to) } };
        if (name === '@/constants/api') {
          return {
            API_BASE_URL: 'http://test', API_TIMEOUT_MS: 15000, USE_API_MOCKS: false,
            UPLOAD_RESPONSE_TIMEOUT_MS: 1, UPLOAD_STALL_TIMEOUT_MS: 1,
            endpoints: { refresh: () => '/auth/refresh' },
          };
        }
        if (name === '@/utils/auth') {
          return {
            getToken: async () => store.token,
            getRefreshToken: async () => store.refresh,
            saveSession: async ({ accessToken, refreshToken: next }) => {
              store.token = accessToken;
              store.refresh = next;
            },
            removeToken: async () => { store.token = null; store.refresh = null; },
          };
        }
        return {};
      },
    },
  );
  exports.setSessionExpiredHandler((reason) => ended.push(reason));
  return { api: exports, store, calls, redirects, ended };
}

const authorizedAs = (init) => init.headers?.Authorization;

test('an expired access token is renewed once and the request is retried', async () => {
  let refreshes = 0;
  const c = client({
    routes: (pathName, init, store) => {
      if (pathName === '/auth/refresh') {
        refreshes++;
        assert.equal(JSON.parse(init.body).refresh_token, 'refresh-1');
        return json(200, { access_token: 'access-2', refresh_token: 'refresh-2' });
      }
      return authorizedAs(init) === 'Bearer access-2' ? json(200, { ok: pathName }) : json(401, { detail: 'Could not validate credentials' });
    },
  });

  const [a, b] = await Promise.all([c.api.apiFetch('/a'), c.api.apiFetch('/b')]);

  assert.deepEqual([a, b], [{ ok: '/a' }, { ok: '/b' }]);
  assert.equal(refreshes, 1);
  assert.equal(c.store.refresh, 'refresh-2');
  assert.deepEqual(c.redirects, []);
});

test('a rejected refresh ends the session with the right reason', async () => {
  for (const [status, detail, reason] of [
    [401, 'Invalid refresh token', 'expired'],
    [403, 'Account is banned or suspended', 'moderated'],
    [403, 'Account has been deleted', 'deleted'],
  ]) {
    const c = client({
      routes: (pathName) => (pathName === '/auth/refresh' ? json(status, { detail }) : json(401, {})),
    });
    await assert.rejects(c.api.apiFetch('/a'), (error) => error.status === 401);
    assert.deepEqual(c.ended, [reason]);
    assert.deepEqual(c.redirects, ['/Login']);
    assert.equal(c.store.token, null);
  }
});

test('without a refresh token the 401 ends the session as before', async () => {
  const c = client({ refreshToken: null, routes: () => json(401, {}) });
  await assert.rejects(c.api.apiFetch('/a'), (error) => error.status === 401);
  assert.deepEqual(c.ended, ['expired']);
  assert.equal(c.calls.filter((call) => call.path === '/auth/refresh').length, 0);
});

test('no network during refresh keeps the saved session', async () => {
  const c = client({
    routes: (pathName) => {
      if (pathName === '/auth/refresh') throw new TypeError('Network request failed');
      return json(401, {});
    },
  });
  await assert.rejects(c.api.apiFetch('/a'), (error) => error.status === 401);
  assert.deepEqual(c.redirects, []);
  assert.equal(c.store.refresh, 'refresh-1');
});

test('the caller signal cancels the request', async () => {
  const c = client({ routes: () => json(200, {}) });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    c.api.apiFetch('/a', { signal: controller.signal }),
    (error) => error.kind === 'cancelled',
  );
  await tick();
});

test('skipUnauthorizedHandler never refreshes nor logs out', async () => {
  const c = client({ routes: () => json(401, {}) });
  await assert.rejects(c.api.apiFetch('/a', {}, { skipUnauthorizedHandler: true }));
  assert.equal(c.calls.length, 1);
  assert.deepEqual(c.redirects, []);
});
