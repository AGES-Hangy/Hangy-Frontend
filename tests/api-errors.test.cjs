// src/utils/apiErrors.ts
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const ADMIN_ACCESS_REQUIRED = 'Admin access required';

function load(file, imports) {
  const context = {
    exports: {},
    require: id => {
      assert.ok(imports[id], `unexpected import ${id}`);
      return imports[id];
    },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync(path.join(root, file), 'utf8'), { module: ts.ModuleKind.CommonJS }), context);
  return context.exports;
}

const { describeListLoadError, endsSession } = load('src/utils/apiErrors.ts', {
  '@/utils/http': { ADMIN_ACCESS_REQUIRED, ApiError: class {}, UploadCancelledError: class {} },
});

const http = (status, detail = null) => ({ kind: 'http', status, detail, body: null });
const network = { kind: 'network', status: null, detail: null, body: null };
const timeout = { kind: 'timeout', status: null, detail: null, body: null };
const GENERIC = 'Não foi possível carregar. Tente de novo.';

test('endsSession: 401 e 403 de admin são as falhas que encerram a sessão', () => {
  assert.equal(endsSession(http(401)), true);
  assert.equal(endsSession(http(403, ADMIN_ACCESS_REQUIRED)), true);
});

test('endsSession: outros 403 não encerram a sessão', () => {
  assert.equal(endsSession(http(403, 'Only the organizer can edit this event')), false);
  assert.equal(endsSession(http(403)), false);
});

test('endsSession: servidor, rede, timeout e erro que não é da API não encerram a sessão', () => {
  for (const error of [http(500), network, timeout, new Error('boom'), null, undefined]) {
    assert.equal(endsSession(error), false);
  }
});

test('describeListLoadError: mantém sem conexão e timeout', () => {
  assert.equal(describeListLoadError(network).kind, 'offline');
  assert.equal(describeListLoadError(timeout).kind, 'timeout');
});

test('describeListLoadError: 404 e 410 não falam de evento e permitem tentar de novo', () => {
  for (const error of [http(404), http(410)]) {
    const loadError = describeListLoadError(error);
    assert.equal(loadError.kind, 'server');
    assert.equal(loadError.message, GENERIC);
    assert.equal(loadError.canRetry, true);
  }
});

test('describeListLoadError: 5xx fica com o título do frame `Erro do servidor`', () => {
  for (const error of [http(500), http(503)]) {
    const loadError = describeListLoadError(error);
    assert.equal(loadError.kind, 'server');
    assert.equal(loadError.title, 'Algo deu errado do nosso lado');
    assert.equal(loadError.message, GENERIC);
  }
});

test('describeListLoadError: erro que não é da API vira o erro genérico', () => {
  for (const error of [new Error('boom'), null]) {
    assert.equal(describeListLoadError(error).message, GENERIC);
  }
});
