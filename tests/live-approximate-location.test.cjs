// Helpers puros do pin aproximado da aba Ao Vivo (task 274), rodando as funções de produção.
// Sem renderer nativo: pin, área e enquadramento no mapa ficam no QA manual.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const names = ['formatDistance', 'isLocationApproximate', 'approximateRadius', 'circleEdges', 'approximateLocationLabel', 'formatApproximateDistance'];
function load() {
  const file = 'src/app/(tabs)/Live/index.tsx';
  const ast = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const parts = ['const METERS_PER_DEGREE = 111320; const APPROXIMATE_DISTANCE_STEP_M = 100;'];
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) parts.push(node.getText(ast));
    ts.forEachChild(node, visit);
  })(ast);
  const context = { Intl, Math };
  vm.createContext(context);
  vm.runInContext(ts.transpile(parts.join('\n'), { module: ts.ModuleKind.CommonJS }), context);
  return context;
}
const live = load();

test('location_precision decide, não privacy; campo ausente conta como EXACT', () => {
  assert.equal(live.isLocationApproximate({ location_precision: 'APPROXIMATE', privacy: 'PRIVATE' }), true);
  assert.equal(live.isLocationApproximate({ location_precision: 'EXACT', privacy: 'PRIVATE' }), false);
  assert.equal(live.isLocationApproximate({ privacy: 'PRIVATE' }), false);
});

test('área só existe para aproximado com raio válido', () => {
  assert.equal(live.approximateRadius({ location_precision: 'APPROXIMATE', location_radius_m: 500 }), 500);
  assert.equal(live.approximateRadius({ location_precision: 'APPROXIMATE', location_radius_m: null }), null);
  assert.equal(live.approximateRadius({ location_precision: 'APPROXIMATE', location_radius_m: 0 }), null);
  assert.equal(live.approximateRadius({ location_precision: 'EXACT', location_radius_m: 500 }), null);
});

test('enquadramento usa as bordas do círculo, não só o centro', () => {
  const center = { latitude: -30.0531, longitude: -51.1762 };
  const edges = live.circleEdges(center, 500);
  assert.equal(edges.length, 4);
  const lat = edges.map((e) => e.latitude), lon = edges.map((e) => e.longitude);
  assert.ok(Math.abs((Math.max(...lat) - Math.min(...lat)) * 111320 - 1000) < 1);
  assert.ok(Math.max(...lon) > center.longitude && Math.min(...lon) < center.longitude);
});

test('preview fala em região e distância aproximada', () => {
  assert.equal(live.approximateLocationLabel('Jardim Botânico, Porto Alegre'), 'Região do Jardim Botânico');
  assert.equal(live.approximateLocationLabel(null), 'Local aproximado');
  assert.equal(live.approximateLocationLabel(''), 'Local aproximado');
  assert.equal(live.formatApproximateDistance(612), '~600 m');
  assert.equal(live.formatApproximateDistance(20), '~100 m');
  assert.equal(live.formatApproximateDistance(1460), '~1,5 km');
});
