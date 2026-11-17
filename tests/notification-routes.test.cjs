const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

function load(file) {
  const exports = {};
  vm.runInNewContext(
    ts.transpile(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { module: ts.ModuleKind.CommonJS }),
    { exports, require: () => ({}) },
  );
  return exports;
}

const { notificationRoute } = load('src/utils/notificationRoute.ts');
const { getNotificationDestination } = load('src/constants/notificationRoutes.ts');

test('a push for an event removed by moderation opens the notification center', () => {
  assert.equal(notificationRoute({ type: 'EVENT_REMOVED', event_id: 'e-1' }), '/Notifications');
  assert.deepEqual(
    JSON.parse(JSON.stringify(notificationRoute({ type: 'EVENT_CANCELLED', event_id: 'e-1' }))),
    { pathname: '/EventDetail', params: { id: 'e-1' } },
  );
});

test('a removed event notification has no destination screen', () => {
  assert.equal(
    getNotificationDestination({ type: 'EVENT_REMOVED', payload: { event_id: 'e-1' } }),
    null,
  );
});
