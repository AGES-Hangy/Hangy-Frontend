// Transições puras do favorito usadas pelo useFavoriteEvent; o hook e a tela ficam no QA manual.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function functions(file, names) {
  const ast = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const parts = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) parts.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return parts.join('\n');
}
function evaluate(source, context) {
  vm.createContext(context);
  vm.runInContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS }), context);
  return context;
}
const {
  createFavoriteState, setFavorite, retryFavorite, isCurrentRequest,
  confirmFavorite, revertFavorite, syncFavorite, favoriteErrorOutcome,
} = evaluate(functions('src/utils/favoriteEvent.ts', [
  'createFavoriteState', 'setFavorite', 'retryFavorite', 'isCurrentRequest',
  'confirmFavorite', 'revertFavorite', 'syncFavorite', 'favoriteErrorOutcome',
]), { exports: {} });
const plain = value => JSON.parse(JSON.stringify(value));

test('applies the optimistic value and returns the request with target and previous', () => {
  const { state, request } = setFavorite(createFavoriteState('event', false), true);
  assert.deepEqual(plain(request), { eventId: 'event', target: true, previous: false });
  assert.equal(state.isFavorited, true);
  assert.equal(state.inFlight, request);
  assert.equal(setFavorite(createFavoriteState(undefined, false), true).request, null);
});
test('ignores a new tap while a request is in flight', () => {
  const first = setFavorite(createFavoriteState('event', false), true);
  const second = setFavorite(first.state, false);
  assert.equal(second.request, null);
  assert.equal(second.state, first.state);
});
test('confirms the target on success and clears the in-flight request', () => {
  const { state, request } = setFavorite(createFavoriteState('event', true), false);
  const confirmed = confirmFavorite(state, request);
  assert.equal(confirmed.isFavorited, false);
  assert.equal(confirmed.inFlight, null);
  assert.equal(confirmed.lastFailure, null);
});
test('reverts to the previous value on failure and records it as the last failure', () => {
  const { state, request } = setFavorite(createFavoriteState('event', false), true);
  const reverted = revertFavorite(state, request);
  assert.equal(reverted.isFavorited, false);
  assert.equal(reverted.inFlight, null);
  assert.equal(reverted.lastFailure, request);
});
test('discards a response whose eventId is no longer current', () => {
  const { state, request } = setFavorite(createFavoriteState('old', false), true);
  const switched = syncFavorite(state, 'new', false);
  assert.equal(isCurrentRequest(switched, request), false);
  assert.equal(confirmFavorite(switched, request), switched);
  assert.equal(revertFavorite(switched, request), switched);
});
test('syncs with the GET value only when no request is in flight', () => {
  const idle = createFavoriteState('event', false);
  assert.equal(syncFavorite(idle, 'event', true).isFavorited, true);
  const { state } = setFavorite(idle, true);
  assert.equal(syncFavorite(state, 'event', false), state);
});
test('resets when the eventId changes, even with a request in flight', () => {
  const failed = setFavorite(createFavoriteState('old', false), true);
  const withFailure = revertFavorite(failed.state, failed.request);
  const { state } = setFavorite(withFailure, true);
  assert.deepEqual(plain(syncFavorite(state, 'new', false)), { eventId: 'new', isFavorited: false, inFlight: null, lastFailure: null });
});
test('retry reapplies the target of the failed attempt', () => {
  const first = setFavorite(createFavoriteState('event', true), false);
  const reverted = revertFavorite(first.state, first.request);
  const { state, request } = retryFavorite(reverted, first.request);
  assert.deepEqual(plain(request), { eventId: 'event', target: false, previous: true });
  assert.equal(state.isFavorited, false);
  assert.equal(state.lastFailure, null);
});
test('fast double tap produces a single request', () => {
  let state = createFavoriteState('event', false);
  const requests = [];
  for (let tap = 0; tap < 2; tap++) {
    const result = setFavorite(state, !state.isFavorited);
    state = result.state;
    if (result.request) requests.push(result.request);
  }
  assert.equal(requests.length, 1);
  assert.equal(state.isFavorited, true);
});
test('failure after switching events does not revert the new event', () => {
  const old = setFavorite(createFavoriteState('old', false), true);
  const current = setFavorite(syncFavorite(old.state, 'new', false), true);
  const after = revertFavorite(current.state, old.request);
  assert.equal(after.isFavorited, true);
  assert.equal(after.inFlight, current.request);
  assert.equal(after.lastFailure, null);
});
test('any tap after a failure invalidates its retry', () => {
  const failed = setFavorite(createFavoriteState('event', false), true);
  const reverted = revertFavorite(failed.state, failed.request);

  const oneTap = setFavorite(reverted, true);
  const afterOne = confirmFavorite(oneTap.state, oneTap.request);
  assert.equal(retryFavorite(afterOne, failed.request).request, null);
  assert.equal(afterOne.isFavorited, true);

  const secondTap = setFavorite(afterOne, false);
  const afterTwo = confirmFavorite(secondTap.state, secondTap.request);
  const retry = retryFavorite(afterTwo, failed.request);
  assert.equal(retry.request, null);
  assert.equal(retry.state.isFavorited, false);
});
test('401 is ignored because the session handler already takes over', () => {
  assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'http', status: 401 }, true)), { kind: 'ignore' });
});
test('404 reports the event as unavailable', () => {
  assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'http', status: 404 }, true)), { kind: 'unavailable', message: 'Este evento não está mais disponível' });
});
test('timeout offers a retry', () => {
  assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'timeout', status: null }, false)), { kind: 'retry', message: 'A conexão demorou demais' });
});
test('network failure reports no connection', () => {
  assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'network', status: null }, true)), { kind: 'failed', message: 'Sem conexão com a internet' });
});
test('network and timeout messages match the shared API error descriptions', () => {
  const { describeLoadError, describeActionError } = evaluate(
    functions('src/utils/apiErrors.ts', ['describeLoadError', 'describeActionError', 'isApiErrorLike']),
    { exports: {}, ApiError: class {}, GENERIC_ACTION_ERROR: {} },
  );
  for (const kind of ['network', 'timeout']) {
    const error = { kind, status: null, detail: null };
    const { message } = favoriteErrorOutcome(error, true);
    assert.equal(message, describeLoadError(error).message);
    assert.equal(message, describeActionError(error).message);
  }
});
test('403 and 5xx name the attempted action', () => {
  for (const status of [403, 500, 503]) {
    assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'http', status }, true)), { kind: 'failed', message: 'Não foi possível favoritar. Tente de novo.' });
    assert.deepEqual(plain(favoriteErrorOutcome({ kind: 'http', status }, false)), { kind: 'failed', message: 'Não foi possível remover dos favoritos. Tente de novo.' });
  }
});
