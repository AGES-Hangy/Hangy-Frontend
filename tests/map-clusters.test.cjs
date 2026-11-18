const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/mapClusters.ts'), 'utf8');
const mod = {};
vm.runInNewContext(
  ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
  { exports: mod, Math, Array },
);
const { clusterByScreenDistance, spreadInMeters } = mod;

// 0.02° de lado numa tela de 400×400: 1 ponto ≈ 0.00005°.
const REGION = { latitude: -30.03, longitude: -51.21, latitudeDelta: 0.02, longitudeDelta: 0.02 };
const SIZE = { width: 400, height: 400 };
const key = (item) => item.id;
const coord = (item) => item.location;
const at = (id, latitude, longitude) => ({ id, location: { latitude, longitude } });

test('pins that overlap on screen become one cluster with the mean centre', () => {
  const items = [at('a', -30.03, -51.21), at('b', -30.03, -51.2101), at('c', -30.0301, -51.21)];
  const result = clusterByScreenDistance(items, key, coord, REGION, SIZE, 56);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'cluster');
  assert.equal(result[0].key, 'cluster-a');
  assert.deepEqual(Array.from(result[0].items.map(key)), ['a', 'b', 'c']);
  assert.ok(Math.abs(result[0].center.latitude - -30.0300333) < 1e-6);
});

test('pins far apart on screen stay single', () => {
  const items = [at('a', -30.03, -51.21), at('b', -30.03, -51.2)];
  const result = clusterByScreenDistance(items, key, coord, REGION, SIZE, 56);
  assert.deepEqual(Array.from(result.map((entry) => entry.kind)), ['single', 'single']);
});

test('the same pins split once the map zooms in', () => {
  // 0.001° de distância: 20 pontos com 0.02° de lado, 200 com 0.002°.
  const items = [at('a', -30.03, -51.21), at('b', -30.03, -51.209)];
  assert.equal(clusterByScreenDistance(items, key, coord, REGION, SIZE, 56).length, 1);
  const zoomed = { ...REGION, latitudeDelta: 0.002, longitudeDelta: 0.002 };
  assert.equal(clusterByScreenDistance(items, key, coord, zoomed, SIZE, 56).length, 2);
});

test('without a measured map every item stays single', () => {
  const items = [at('a', -30.03, -51.21), at('b', -30.03, -51.21)];
  const result = clusterByScreenDistance(items, key, coord, REGION, { width: 0, height: 0 }, 56);
  assert.deepEqual(Array.from(result.map((entry) => entry.kind)), ['single', 'single']);
});

test('spread is zero for coincident points and grows with distance', () => {
  assert.equal(spreadInMeters([{ latitude: -30, longitude: -51 }, { latitude: -30, longitude: -51 }]), 0);
  const meters = spreadInMeters([{ latitude: -30, longitude: -51 }, { latitude: -30.001, longitude: -51 }]);
  assert.ok(meters > 105 && meters < 117, `${meters}`);
});
