// Focused regression tests running the production functions with controlled IO.
// No native renderer: device layout/permissions are covered by manual QA.
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
function participation(join) {
  const toasts = [], updates = [];
  const context = {
    events: [{ event_id: 'event', title: 'Event', is_confirmed: false }],
    pendingEventIds: new Set(), isSubmitting: false, isOffline: false,
    join, addToast: value => toasts.push(value),
    setPendingEventIds: update => { context.pendingEventIds = update(context.pendingEventIds); },
    setConfirmed: (...args) => updates.push(args), showSuccessToast: () => {}, setIsCancelDialogVisible: () => {},
  };
  evaluate(functions('src/app/(tabs)/Live/index.tsx', ['handleParticipationPress']), context);
  return { context, toasts, updates };
}
test('pending request blocks a second submission', async () => {
  let calls = 0;
  const { context, toasts } = participation(async () => { calls++; return { status: 'PENDING' }; });
  await context.handleParticipationPress('event');
  await context.handleParticipationPress('event');
  assert.equal(calls, 1);
  assert.equal(context.pendingEventIds.has('event'), true);
  assert.equal(toasts.length, 1);
});
test('409 distinguishes pending, confirmed, full, organizer and unknown conflict', async () => {
  for (const [detail, message] of [
    ['Request already pending', 'Sua solicitação já está aguardando aprovação.'],
    ['Already participating in this event', 'Sua presença já está confirmada.'],
    ['Event is full', 'Este evento está lotado'],
    ['Event creator cannot join their own event', 'Você é o organizador deste evento.'],
    ['Event already finished', 'Este evento já foi encerrado.'],
    ['Unknown conflict', 'Não foi possível confirmar presença. Tente de novo.'],
  ]) {
    const { context, toasts, updates } = participation(async () => { throw { status: 409, detail }; });
    await context.handleParticipationPress('event');
    assert.equal(toasts[0].message, message);
    if (detail === 'Request already pending') assert(context.pendingEventIds.has('event'));
    if (detail === 'Already participating in this event') assert.deepEqual(updates, [['event', true]]);
  }
});
test('late nearby responses cannot undo successful join or cancellation; next search still works', async () => {
  for (const confirmed of [true, false]) {
    let index = 0, resolve;
    const state = [];
    const context = evaluate(
      'const SEARCH_DEBOUNCE_MS=500, MAX_RADIUS_M=50000, EARTH_RADIUS_M=6371000, RADIUS_EXCEEDED="Radius exceeds maximum", INVALID_COORDINATES="Invalid coordinates";\n' +
      functions('src/hooks/useNearbyEvents.ts', ['distanceInMeters', 'radiusFor', 'useNearbyEvents']), {
        exports: {}, Math,
        useToast: () => ({ addToast: () => {} }),
        useState: initial => { const i = index++; state[i] = initial; return [initial, next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; },
        useRef: initial => ({ current: initial }), useEffect: fn => fn(), useCallback: fn => fn,
        apiFetch: () => new Promise(done => { resolve = done; }),
        endpoints: { eventsNearby: () => '/events/nearby' }, isApiErrorLike: () => false,
        setTimeout, clearTimeout,
      });
    const hook = context.useNearbyEvents();
    state[0] = [{ event_id: 'event', is_confirmed: !confirmed }];
    const region = { latitude: -30, longitude: -51, latitudeDelta: .05, longitudeDelta: .05 };
    const oldSearch = hook.searchNow(region);
    hook.setConfirmed('event', confirmed);
    resolve({ items: [{ event_id: 'event', is_confirmed: !confirmed }] });
    await oldSearch;
    assert.equal(state[0][0].is_confirmed, confirmed);
    assert.equal(state[1], false);
    const freshSearch = hook.searchNow(region);
    resolve({ items: [{ event_id: 'event', is_confirmed: confirmed, title: 'Fresh' }] });
    await freshSearch;
    assert.equal(state[0][0].title, 'Fresh');
  }
});
