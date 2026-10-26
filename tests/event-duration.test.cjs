const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/eventDuration.ts'), 'utf8');
const mod = {};
vm.runInNewContext(
  ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
  { exports: mod, Date, Math },
);
const {
  MAX_EVENT_DURATION_MINUTES, durationFromPickerValue, durationMinutesBetween,
  durationToPickerValue, endDateFrom, hasEventEnded, isValidDuration,
} = mod;

const START = '2026-10-26T20:00:00.000Z';

test('end_date is the start plus the chosen hours and minutes', () => {
  assert.equal(endDateFrom(new Date(START), 90).toISOString(), '2026-10-26T21:30:00.000Z');
  assert.equal(endDateFrom(new Date(START), MAX_EVENT_DURATION_MINUTES).toISOString(), '2026-10-27T19:59:00.000Z');
});

test('a saved duration round-trips through the time picker value', () => {
  const minutes = durationMinutesBetween(START, '2026-10-26T23:05:00.000Z');
  assert.equal(minutes, 185);
  const picker = durationToPickerValue(minutes);
  assert.equal(picker.getHours(), 3);
  assert.equal(picker.getMinutes(), 5);
  assert.equal(durationFromPickerValue(picker), 185);
});

test('the picker cannot show more than 23:59', () => {
  const picker = durationToPickerValue(26 * 60);
  assert.equal(durationFromPickerValue(picker), MAX_EVENT_DURATION_MINUTES);
});

test('duration is required and must be greater than zero', () => {
  assert.equal(isValidDuration(null), false);
  assert.equal(isValidDuration(0), false);
  assert.equal(isValidDuration(1), true);
  assert.equal(isValidDuration(MAX_EVENT_DURATION_MINUTES), true);
});

test('an event has ended by status or once end_date is reached', () => {
  const end = new Date('2026-10-26T22:00:00.000Z').getTime();
  const published = { status: 'PUBLISHED', end_date: '2026-10-26T22:00:00.000Z' };
  assert.equal(hasEventEnded(published, end - 1), false);
  assert.equal(hasEventEnded(published, end), true);
  assert.equal(hasEventEnded(published, end + 60_000), true);
  assert.equal(hasEventEnded({ ...published, status: 'FINISHED' }, end - 3_600_000), true);
});
