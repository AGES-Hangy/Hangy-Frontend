// Executa os hooks reais do detalhe de denúncia com um host mínimo de React e
// respostas de API controladas, e os cenários do mock do painel.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const flush = () => new Promise((resolve) => setImmediate(resolve));

function transpile(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  return ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 });
}

function apiError(status, detail = null, kind = 'http') {
  return Object.assign(new Error(detail ?? kind), { kind, status, detail });
}

/** Roda um hook como componente: cada `render()` reexecuta com os mesmos slots de estado. */
function host(file, imports, args = []) {
  const slots = [];
  const pendingEffects = [];
  let cursor = 0;
  const changed = (deps, prev) => !prev || deps.some((value, i) => value !== prev[i]);

  const react = {
    useState: (initial) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef: (initial) => {
      const i = cursor++;
      return (slots[i] ||= { current: initial });
    },
    useCallback: (fn, deps) => {
      const i = cursor++;
      if (changed(deps, slots[i]?.deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect: (fn, deps) => {
      const i = cursor++;
      if (changed(deps, slots[i]?.deps)) {
        const previous = slots[i];
        slots[i] = { deps };
        pendingEffects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn(); });
      }
    },
  };

  const mod = {};
  vm.runInNewContext(transpile(file), {
    exports: mod,
    require: (name) => (name === 'react' ? react : imports[name]),
    console,
    Date,
    JSON,
    Promise,
    Object,
  });
  const hookName = Object.keys(mod).find((key) => key.startsWith('use'));

  const render = () => {
    cursor = 0;
    const result = mod[hookName](...args);
    while (pendingEffects.length) pendingEffects.shift()();
    return result;
  };
  return { render, mod };
}

const endpoints = {
  adminReport: (id) => `/admin/reports/${id}`,
  adminReportArchive: (id) => `/admin/reports/${id}/archive`,
  adminUserModeration: (id) => `/admin/users/${id}/moderation`,
};

const apiErrors = (() => {
  const mod = {};
  vm.runInNewContext(transpile('src/utils/apiErrors.ts'), {
    exports: mod,
    require: () => ({ ApiError: class {}, UploadCancelledError: class {} }),
    console: { warn() {} },
    Object,
  });
  return mod;
})();

function moderationHook(apiFetch) {
  const toasts = [];
  const hook = host('src/hooks/useReportModeration.ts', {
    '@/components/Toast': { useToast: () => ({ addToast: (toast) => toasts.push(toast) }) },
    '@/constants/api': { endpoints },
    '@/hooks/useModerateUser': { SUSPENSION_DAYS: 7 },
    '@/utils/apiErrors': apiErrors,
    '@/utils/http': { apiFetch },
  });
  return { ...hook, toasts };
}

test('banir e suspender agem sobre a conta do alvo e resolvem a denúncia junto', async () => {
  const calls = [];
  const { render } = moderationHook(async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) });
    return { moderation_status: JSON.parse(init.body).action === 'BAN' ? 'BANNED' : 'SUSPENDED' };
  });

  assert.deepEqual({ ...(await render().ban('user-1', 'report-1')) }, { status: 'done', moderationStatus: 'BANNED' });
  assert.deepEqual({ ...(await render().suspend('user-1', 'report-1')) }, { status: 'done', moderationStatus: 'SUSPENDED' });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { url: '/admin/users/user-1/moderation', method: 'PATCH', body: { action: 'BAN', report_id: 'report-1' } },
    {
      url: '/admin/users/user-1/moderation',
      method: 'PATCH',
      body: { action: 'SUSPEND', duration_days: 7, report_id: 'report-1' },
    },
  ]);
});

test('arquivar usa o endpoint da denúncia e não toca na conta', async () => {
  const calls = [];
  const { render } = moderationHook(async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    return undefined;
  });

  const result = await render().archive('report-1');
  assert.deepEqual({ ...result }, { status: 'done', moderationStatus: undefined });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ url: '/admin/reports/report-1/archive', method: 'PATCH' }]);
});

test('409 e 404 viram "stale" com aviso, para a tela recarregar', async () => {
  const errors = [
    apiError(409, 'Report already resolved'),
    apiError(409, 'Account is already banned'),
    apiError(404, 'User not found'),
  ];
  const { render, toasts } = moderationHook(async () => { throw errors.shift(); });

  assert.equal((await render().ban('u', 'r')).status, 'stale');
  assert.equal((await render().suspend('u', 'r')).status, 'stale');
  assert.equal((await render().ban('u', 'r')).status, 'stale');
  assert.deepEqual(JSON.parse(JSON.stringify(toasts)), [
    { type: 'warning', message: 'Esta denúncia já foi encerrada por outra pessoa.' },
    { type: 'warning', message: 'Esta conta já está banida.' },
    { type: 'warning', message: 'Esta denúncia ou a conta não existe mais.' },
  ]);
});

test('409 da própria conta só avisa, sem recarregar', async () => {
  const errors = [
    apiError(409, 'Admins cannot moderate their own account'),
    apiError(409, 'Report is not about this user'),
    apiError(409, 'Some new conflict'),
  ];
  const { render, toasts } = moderationHook(async () => { throw errors.shift(); });

  assert.equal((await render().ban('u', 'r')).status, 'rejected');
  assert.equal((await render().suspend('u', 'r')).status, 'rejected');
  assert.equal((await render().ban('u', 'r')).status, 'stale');
  assert.deepEqual(JSON.parse(JSON.stringify(toasts)), [
    { type: 'warning', message: 'Não é possível moderar a própria conta.' },
    { type: 'warning', message: 'Esta denúncia não é sobre esta conta.' },
    { type: 'warning', message: 'A denúncia ou a conta mudou. Confira o estado atual.' },
  ]);
});

test('falha de rede e de servidor mostram toast de erro; 401 fica com o tratamento global', async () => {
  const errors = [apiError(null, null, 'network'), apiError(500, 'Internal server error'), apiError(401)];
  const { render, toasts } = moderationHook(async () => { throw errors.shift(); });

  assert.equal((await render().ban('u', 'r')).status, 'failed');
  assert.equal((await render().archive('r')).status, 'failed');
  assert.equal(render().error, 'Não foi possível concluir a ação. Tente de novo.');
  assert.equal((await render().suspend('u', 'r')).status, 'failed');
  assert.deepEqual(
    toasts.map((toast) => toast.message),
    ['Sem conexão com a internet', 'Não foi possível concluir a ação. Tente de novo.'],
  );
});

test('toque duplo durante a ação não manda uma segunda requisição', async () => {
  let release;
  let count = 0;
  const { render } = moderationHook(() => {
    count += 1;
    return new Promise((resolve) => { release = () => resolve({ moderation_status: 'BANNED' }); });
  });

  const first = render().ban('u', 'r');
  await flush();
  assert.equal(render().pendingAction, 'BAN');
  assert.equal(render().isLoading, true);
  assert.deepEqual({ ...(await render().ban('u', 'r')) }, { status: 'ignored' });

  release();
  assert.equal((await first).status, 'done');
  assert.equal(count, 1);
  assert.equal(render().pendingAction, null);
});

function reportFixture() {
  return {
    report_id: 'r1',
    report_number: 1042,
    status: 'REVIEWED',
    target: { id: 'u1', name: 'Lucas Ferreira', moderation_status: 'ACTIVE' },
    resolution: null,
  };
}

function reportHook(reportId, apiFetch) {
  return host(
    'src/hooks/useAdminReport.ts',
    {
      '@/constants/api': { endpoints },
      '@/utils/apiErrors': apiErrors,
      '@/utils/http': { apiFetch },
    },
    [reportId],
  );
}

test('detalhe carrega e troca de estado no lugar, sem um novo GET', async () => {
  let gets = 0;
  const { render } = reportHook('r1', async (url) => {
    gets += 1;
    assert.equal(url, '/admin/reports/r1');
    return reportFixture();
  });

  assert.equal(render().isLoading, true);
  await flush();
  let state = render();
  assert.equal(state.isLoading, false);
  assert.equal(state.report.status, 'REVIEWED');

  const resolution = { resolved_by: { id: 'a', name: 'Gabriel' }, resolved_at: '2026-11-04T14:32:00Z', action: 'BANNED' };
  state.patchReport({ status: 'RESOLVED', moderationStatus: 'BANNED', resolution });
  state = render();

  assert.equal(state.report.status, 'RESOLVED');
  assert.equal(state.report.target.moderation_status, 'BANNED');
  assert.equal(state.report.target.name, 'Lucas Ferreira');
  assert.equal(state.report.resolution.action, 'BANNED');
  assert.equal(gets, 1);
});

test('404 vira "denúncia não encontrada" sem tentar de novo; 500 deixa tentar', async () => {
  const errors = [apiError(404, 'Report not found'), apiError(500, 'Internal server error')];
  const notFound = reportHook('missing', async () => { throw errors.shift(); });
  notFound.render();
  await flush();
  const missing = notFound.render();
  assert.equal(missing.report, null);
  assert.equal(missing.error.title, 'Denúncia não encontrada');
  assert.equal(missing.error.canRetry, false);

  const broken = reportHook('boom', async () => { throw errors.shift(); });
  broken.render();
  await flush();
  assert.equal(broken.render().error.canRetry, true);
});

test('id que não é UUID (422) também é "denúncia não encontrada", sem tentar de novo', async () => {
  const invalid = reportHook('123', async () => { throw apiError(422, [{ msg: 'Input should be a valid UUID' }]); });
  invalid.render();
  await flush();
  const state = invalid.render();
  assert.equal(state.error.title, 'Denúncia não encontrada');
  assert.equal(state.error.canRetry, false);
});

test('mock: banir resolve a denúncia e o GET seguinte já vem resolvido', () => {
  const { resolveAdminMock } = loadMock();
  const ban = resolveAdminMock(['admin', 'users', 'conta-denunciada', 'moderation'], 'PATCH', {
    body: JSON.stringify({ action: 'BAN', report_id: 'mock-ban' }),
  });
  assert.equal(ban.resposta.moderation_status, 'BANNED');

  const { resposta } = resolveAdminMock(['admin', 'reports', 'mock-ban'], 'GET', {});
  assert.equal(resposta.status, 'RESOLVED');
  assert.equal(resposta.target.moderation_status, 'BANNED');
  assert.equal(resposta.resolution.action, 'BANNED');

  const again = resolveAdminMock(['admin', 'reports', 'mock-ban', 'archive'], 'PATCH', {});
  assert.deepEqual({ ...again.erro }, { status: 409, detail: 'Report already resolved' });
});

test('mock: cenários de erro respondem como o backend', () => {
  const { resolveAdminMock } = loadMock();
  const suspend = (reportId) =>
    resolveAdminMock(['admin', 'users', 'u', 'moderation'], 'PATCH', {
      body: JSON.stringify({ action: 'SUSPEND', duration_days: 7, report_id: reportId }),
    });

  assert.equal(suspend('banned').erro.detail, 'Account is already banned');
  assert.equal(suspend('taken').erro.detail, 'Report already resolved');
  assert.equal(resolveAdminMock(['admin', 'reports', 'taken'], 'GET', {}).resposta.status, 'RESOLVED');
  assert.equal(suspend('offline').semRede, true);
  assert.equal(resolveAdminMock(['admin', 'reports', 'missing'], 'GET', {}).erro.status, 404);
  assert.equal(resolveAdminMock(['admin', 'reports', 'archived'], 'GET', {}).resposta.status, 'REJECTED');
  assert.equal(resolveAdminMock(['events', '1'], 'GET', {}), undefined);
});

test('mock: moderação sem denúncia (ficha do usuário) não passa pelo mock da denúncia', () => {
  const { resolveAdminMock } = loadMock();
  const patch = (body) =>
    resolveAdminMock(['admin', 'users', 'u', 'moderation'], 'PATCH', { body: JSON.stringify(body) });

  assert.equal(patch({ action: 'REVERT' }), undefined);
  assert.equal(patch({ action: 'BAN' }), undefined);
  assert.equal(patch({ action: 'SUSPEND', duration_days: 7 }), undefined);
});

function loadMock() {
  const mod = {};
  vm.runInNewContext(transpile('src/mocks/adminApi.ts'), {
    exports: mod,
    require: () => ({}),
    Date,
    JSON,
    Map,
    String,
  });
  return mod;
}
