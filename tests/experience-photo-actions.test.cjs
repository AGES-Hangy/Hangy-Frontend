const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/app/(tabs)/(screens)/EventDetail/index.tsx'), 'utf8');
const ast = ts.createSourceFile('EventDetail.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
(function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['handleUploadError', 'handleRemoveConfirm'].includes(node.name?.text)) functions.push(node.getText(ast));
  ts.forEachChild(node, visit);
})(ast);
function screen(removePhoto) {
  const state = { limited: false, dialog: 'photo', toasts: [], dropped: [] };
  const context = {
    photoToRemove: 'photo', removePhoto,
    setIsPhotoLimitReached: value => state.limited = value,
    setPhotoToRemove: value => state.dialog = value,
    addToast: value => state.toasts.push(value),
    dropPhoto: value => state.dropped.push(value),
    setUndeletablePhotoIds() {}, startUpload() {},
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(functions.join('\n'), { module: ts.ModuleKind.CommonJS }), context);
  return { context, state };
}
test('hitting the limit then deleting a photo re-enables adding photos', async () => {
  for (const missing of [false, true]) {
    const { context, state } = screen(async () => {
      if (missing) throw { kind: 'http', status: 404 };
      return true;
    });
    context.handleUploadError({ kind: 'http', status: 409, detail: 'Photo limit reached' }, {});
    assert.equal(state.limited, true);
    await context.handleRemoveConfirm();
    assert.equal(state.limited, false);
    assert.equal(state.dialog, null);
    assert.equal(state.toasts.length, 1);
  }
});
test('a failed delete keeps the limit; stale cancellation does not close a new dialog', async () => {
  for (const kind of ['network', 'cancelled']) {
    const { context, state } = screen(async () => { throw { kind }; });
    state.limited = true;
    await context.handleRemoveConfirm();
    assert.equal(state.limited, true);
    assert.equal(state.toasts.length, kind === 'cancelled' ? 0 : 1);
    if (kind === 'cancelled') assert.equal(state.dialog, 'photo');
  }
});
test('expired session and cancelled upload do not produce a second error toast', () => {
  const { context, state } = screen();
  context.handleUploadError({ kind: 'http', status: 401 }, {});
  context.handleUploadError({ kind: 'cancelled' }, {});
  assert.deepEqual(state.toasts, []);
});
