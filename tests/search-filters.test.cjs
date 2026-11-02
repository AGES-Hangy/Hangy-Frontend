const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/searchFilters.ts'), 'utf8');
const mod = {};
vm.runInNewContext(
  ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
  { exports: mod, Date, Set, Object },
);
const {
  blockApplies, countActiveFilters, fromDateKey, normalizeFilterValue, resolveDatePreset, toDateKey,
  validateDateRange,
} = mod;

// Quarta-feira, 28/10/2026, à noite — perto da virada de dia em UTC.
const WEDNESDAY = new Date(2026, 9, 28, 23, 30);

test('date keys use the local day and reject impossible dates', () => {
  assert.equal(toDateKey(WEDNESDAY), '2026-10-28');
  assert.equal(toDateKey(fromDateKey('2026-11-01')), '2026-11-01');
  assert.equal(fromDateKey('2026-02-30'), undefined);
  assert.equal(fromDateKey(undefined), undefined);
});

test('presets resolve to ranges relative to now', () => {
  assert.deepEqual({ ...resolveDatePreset('today', WEDNESDAY) }, { dateFrom: '2026-10-28', dateTo: '2026-10-28' });
  assert.deepEqual({ ...resolveDatePreset('tomorrow', WEDNESDAY) }, { dateFrom: '2026-10-29', dateTo: '2026-10-29' });
  assert.deepEqual({ ...resolveDatePreset('weekend', WEDNESDAY) }, { dateFrom: '2026-10-31', dateTo: '2026-11-01' });
  assert.deepEqual({ ...resolveDatePreset('weekend', new Date(2026, 9, 31)) }, { dateFrom: '2026-10-31', dateTo: '2026-11-01' });
  assert.deepEqual({ ...resolveDatePreset('weekend', new Date(2026, 10, 1)) }, { dateFrom: '2026-11-01', dateTo: '2026-11-01' });
});

test('custom range must be in the future and in order', () => {
  assert.equal(validateDateRange('2026-11-01', '2026-11-15', WEDNESDAY), null);
  assert.equal(validateDateRange('2026-11-01', undefined, WEDNESDAY), null);
  assert.equal(validateDateRange('2026-10-27', undefined, WEDNESDAY).field, 'dateFrom');
  assert.equal(validateDateRange('2026-11-15', '2026-11-01', WEDNESDAY).field, 'dateTo');
});

test('normalize recalculates presets and drops what does not apply', () => {
  const stale = { datePreset: 'today', dateFrom: '2026-10-01', dateTo: '2026-10-01', tagIds: ['a', 'a'] };
  assert.deepEqual(
    { ...normalizeFilterValue(stale, 'Live', WEDNESDAY), tagIds: [...normalizeFilterValue(stale, 'Live', WEDNESDAY).tagIds] },
    { datePreset: 'today', dateFrom: '2026-10-28', dateTo: '2026-10-28', tagIds: ['a'] },
  );

  const people = { datePreset: 'tomorrow', maxDistanceKm: 5, resultType: 'people', tagIds: [] };
  assert.deepEqual(Object.keys(normalizeFilterValue(people, 'Search', WEDNESDAY)).sort(), ['resultType', 'tagIds']);

  const live = { resultType: 'events', maxDistanceKm: 5, tagIds: [] };
  assert.deepEqual(Object.keys(normalizeFilterValue(live, 'Live', WEDNESDAY)), ['tagIds']);

  const emptyCustom = { datePreset: 'custom', tagIds: [] };
  assert.equal(normalizeFilterValue(emptyCustom, 'Search', WEDNESDAY).datePreset, undefined);
});

test('blocks know which result types they filter', () => {
  assert.equal(blockApplies('date', undefined), true);
  assert.equal(blockApplies('date', 'businesses'), false);
  assert.equal(blockApplies('distance', 'businesses'), true);
  assert.equal(blockApplies('distance', 'people'), false);
});

test('active filter count is one per block', () => {
  assert.equal(countActiveFilters({ tagIds: [] }), 0);
  assert.equal(countActiveFilters({ datePreset: 'custom', tagIds: [] }), 0);
  assert.equal(countActiveFilters({ datePreset: 'weekend', tagIds: ['a', 'b'], maxDistanceKm: 5 }), 3);
});
