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
  toNearbyEventFilters, toOffsetIso, validateDateRange,
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

const TAGS = [
  { id: 'macro-0', name: 'Esportes', type: 'MACRO', children: [{ id: 'micro-0-0', name: 'Futebol', type: 'MICRO' }] },
  { id: 'macro-1', name: 'Música', type: 'MACRO', children: [{ id: 'micro-1-0', name: 'Rock', type: 'MICRO' }] },
];

/** Offset local no formato `±HH:MM`, para o teste valer em qualquer fuso. */
function localOffset(date) {
  const minutes = -date.getTimezoneOffset();
  const abs = Math.abs(minutes);
  return `${minutes >= 0 ? '+' : '-'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

test('offset ISO keeps the local wall clock and the same instant', () => {
  const date = new Date(2026, 10, 4, 9, 5, 7, 42);
  const iso = toOffsetIso(date);
  assert.equal(iso, `2026-11-04T09:05:07.042${localOffset(date)}`);
  assert.equal(new Date(iso).getTime(), date.getTime());
});

test('nearby filters turn days into local day bounds', () => {
  const filters = toNearbyEventFilters(
    { tagIds: [], datePreset: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-15' },
    TAGS,
    WEDNESDAY,
  );
  assert.equal(new Date(filters.startsFrom).getTime(), new Date(2026, 10, 1).getTime());
  assert.equal(new Date(filters.startsUntil).getTime(), new Date(2026, 10, 15, 23, 59, 59, 999).getTime());
  assert.deepEqual([...filters.tagIds], []);

  const onlyFrom = toNearbyEventFilters({ tagIds: [], datePreset: 'custom', dateFrom: '2026-11-01' }, TAGS, WEDNESDAY);
  assert.equal(onlyFrom.startsUntil, undefined);
  const noDate = toNearbyEventFilters({ tagIds: [] }, TAGS, WEDNESDAY);
  assert.equal(noDate.startsFrom, undefined);
  assert.equal(noDate.startsUntil, undefined);
});

test('nearby filters recompute presets for now', () => {
  // "Hoje" aplicado ontem continua sendo hoje.
  const stale = { tagIds: [], datePreset: 'today', dateFrom: '2026-10-27', dateTo: '2026-10-27' };
  const filters = toNearbyEventFilters(stale, TAGS, WEDNESDAY);
  assert.equal(new Date(filters.startsFrom).getTime(), new Date(2026, 9, 28).getTime());
  assert.equal(new Date(filters.startsUntil).getTime(), new Date(2026, 9, 28, 23, 59, 59, 999).getTime());
});

test('nearby filters drop a macro narrowed by one of its micro tags', () => {
  const filters = toNearbyEventFilters({ tagIds: ['macro-0', 'micro-0-0', 'macro-1'] }, TAGS, WEDNESDAY);
  assert.deepEqual([...filters.tagIds], ['micro-0-0', 'macro-1']);
});
