const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Executa os módulos puros reais, sem carregar Expo/React Native e sem dependências novas.
// Typecheck é executado separadamente; transpileModule só remove tipos e resolve o formato.
function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const module = { exports: {} };
  const run = vm.runInThisContext(
    `(function(require, module, exports) { ${outputText}\n})`, { filename },
  );
  run((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Import inesperado: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const definitions = loadSource('src/constants/notifications.ts');
const { getNotificationPresentation, isNotificationType } = loadSource('src/utils/notifications.ts', {
  '@/constants/notifications': definitions,
});

const payload = {
  event_id: 'event-123',
  event_title: 'Futebol na Orla',
  sender: { id: 'user-456', name: 'Rafaela' },
};

// Expectativas do contrato de navegação, independentes das constantes de produção.
const cases = [
  ['CONNECTION_ACCEPTED', '/Profile', { userId: 'user-456', name: 'Rafaela' }, 'circle-check', 'Rafaela aceitou sua solicitação de conexão'],
  ['EVENT_PARTICIPATION_REQUEST', '/ManageEvent', { id: 'event-123' }, 'users', 'Rafaela pediu para participar de Futebol na Orla'],
  ['EVENT_REQUEST_APPROVED', '/EventDetail', { id: 'event-123' }, 'circle-check', 'Sua solicitação para participar de Futebol na Orla foi aprovada'],
  ['EVENT_REQUEST_REJECTED', '/EventDetail', { id: 'event-123' }, 'circle-alert', 'Sua solicitação para participar de Futebol na Orla foi recusada'],
  ['EVENT_PARTICIPANT_CANCELLED', '/ManageEvent', { id: 'event-123' }, 'calendar-x', 'Rafaela cancelou a presença em Futebol na Orla'],
  ['EVENT_PARTICIPANT_REMOVED', '/EventDetail', { id: 'event-123' }, 'circle-alert', 'Você foi removido de Futebol na Orla'],
  ['EVENT_PARTICIPANT_JOINED', '/ManageEvent', { id: 'event-123' }, 'users', 'Rafaela confirmou presença em Futebol na Orla'],
  ['EVENT_UPDATED', '/EventDetail', { id: 'event-123' }, 'pencil', 'Futebol na Orla teve informações atualizadas'],
  ['EVENT_CANCELLED', '/EventDetail', { id: 'event-123' }, 'calendar-x', 'Futebol na Orla foi cancelado'],
  ['EVENT_STARTING_SOON', '/EventDetail', { id: 'event-123' }, 'clock', 'Futebol na Orla começa em breve'],
];

for (const [type, pathname, params, icon, title] of cases) {
  test(`${type}: texto, ícone e destino com o identificador correto`, () => {
    assert.deepEqual(getNotificationPresentation({ type, payload }), {
      title, icon,
      requiresAction: type === 'EVENT_PARTICIPATION_REQUEST',
      navigation: { kind: 'route', href: { pathname, params } },
    });
    const screen = `src/app/(tabs)/${pathname === '/Profile' ? '' : '(screens)/'}${pathname.slice(1)}/index.tsx`;
    assert.ok(readFileSync(path.join(__dirname, '..', screen), 'utf8'));
  });

  test(`${type}: sem alvo não abre evento inválido nem o próprio perfil`, () => {
    const presentation = getNotificationPresentation({ type, payload: {} });
    assert.deepEqual(presentation.navigation, { kind: 'unavailable', reason: 'missing-target' });
    assert.doesNotMatch(presentation.title, /undefined|null|\[object Object\]/);
  });
}

test('solicitação de conexão exige ação na tela da 130, nunca no perfil do remetente', () => {
  const presentation = getNotificationPresentation({ type: 'CONNECTION_REQUEST', payload });
  assert.deepEqual(presentation, {
    icon: 'users', title: 'Rafaela quer se conectar com você', requiresAction: true,
    navigation: { kind: 'pending-screen', pathname: '/Notifications/ConnectionRequests', task: '130' },
  });
  assert.equal('href' in presentation.navigation, false);
});

test('tipos futuros, removidos e chaves do prototype têm fallback genérico', () => {
  for (const type of ['NEW_TYPE', 'EVENT_INVITE', 'CONNECTION_REJECTED', '__proto__', 'constructor', 'toString', '']) {
    assert.equal(isNotificationType(type), false);
    assert.deepEqual(getNotificationPresentation({ type, payload }), {
      icon: 'bell', title: 'Você tem uma nova notificação', requiresAction: false,
      navigation: { kind: 'unavailable', reason: 'unknown-type' },
    });
  }
});

test('payload parcial/malformado não quebra a lista nem produz link sem identificador', () => {
  for (const invalidPayload of [null, undefined, [], 'texto', { event_id: 42, sender: [] }, { event_id: '   ', sender: { id: {}, name: 42 } }]) {
    for (const [type] of cases) {
      const presentation = getNotificationPresentation({ type, payload: invalidPayload });
      assert.equal(presentation.navigation.kind, 'unavailable');
      assert.doesNotMatch(presentation.title, /undefined|null|\[object Object\]/);
    }
  }
});

test('nome e título opcionais usam texto neutro e preservam o destino disponível', () => {
  const presentation = getNotificationPresentation({
    type: 'EVENT_PARTICIPATION_REQUEST', payload: { event_id: 'event-123', sender: { name: ' ' } },
  });
  assert.equal(presentation.title, 'Uma pessoa pediu para participar de um evento');
  assert.equal(presentation.navigation.kind, 'route');
});

test('parâmetros permanecem separados do caminho e a entrada não é modificada', () => {
  const input = Object.freeze({
    type: 'CONNECTION_ACCEPTED',
    payload: Object.freeze({ sender: Object.freeze({ id: 'user-456', name: 'Ana & Bia? #1' }) }),
  });
  assert.deepEqual(getNotificationPresentation(input).navigation, {
    kind: 'route', href: { pathname: '/Profile', params: { userId: 'user-456', name: 'Ana & Bia? #1' } },
  });
});
