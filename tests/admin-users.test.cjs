// Funções puras da lista de usuários do admin; o hook e a tela ficam no QA manual.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function load(file, imports = {}) {
  const context = {
    exports: {},
    require: id => {
      assert.ok(imports[id], `unexpected import ${id}`);
      return imports[id];
    },
    URLSearchParams,
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync(path.join(root, file), 'utf8'), { module: ts.ModuleKind.CommonJS }), context);
  return context.exports;
}

const datetime = load('src/utils/datetime.ts');
const {
  ADMIN_USERS_SEARCH_MAX_LENGTH,
  UNNAMED_ADMIN_USER,
  adminUserRowProps,
  adminUsersAnnouncement,
  adminUsersQuery,
  adminUsersStatusOf,
} = load('src/utils/adminUsers.ts', { '@/utils/datetime': datetime });

// Objetos criados no `vm` têm outro `Object.prototype`, e o `deepEqual` estrito compara protótipos.
// O JSON também tira as chaves `undefined`: `summary` ausente e `summary: undefined` ficam iguais.
const plain = value => JSON.parse(JSON.stringify(value));
const params = query => new URLSearchParams(query);

// Meio do dia em UTC: a data local é a mesma de UTC-12 a UTC+11.
const MIDDAY = '2026-11-20T12:00:00Z';

const user = overrides => ({
  user_id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Costa',
  moderation_status: 'ACTIVE',
  suspended_until: null,
  event_count: 0,
  report_count: 0,
  ...overrides,
});

test('adminUsersStatusOf: ALL não filtra e as outras abas passam', () => {
  assert.equal(adminUsersStatusOf('ALL'), null);
  assert.equal(adminUsersStatusOf('SUSPENDED'), 'SUSPENDED');
  assert.equal(adminUsersStatusOf('BANNED'), 'BANNED');
});

test('adminUsersQuery: ALL vai sem status', () => {
  assert.equal(adminUsersQuery({ search: '', filter: 'ALL' }), '');
  assert.equal(params(adminUsersQuery({ search: 'ana', filter: 'ALL' })).has('status'), false);
});

test('adminUsersQuery: SUSPENDED e BANNED vão com status', () => {
  assert.equal(adminUsersQuery({ search: '', filter: 'SUSPENDED' }), 'status=SUSPENDED');
  assert.equal(adminUsersQuery({ search: '', filter: 'BANNED' }), 'status=BANNED');
});

test('adminUsersQuery: tira os espaços das pontas da busca', () => {
  assert.equal(params(adminUsersQuery({ search: '  ana  ', filter: 'ALL' })).get('search'), 'ana');
});

test('adminUsersQuery: busca vazia ou só com espaços vai sem search', () => {
  for (const search of ['', '   ', '\t\n']) {
    assert.equal(params(adminUsersQuery({ search, filter: 'ALL' })).has('search'), false);
  }
});

test('adminUsersQuery: corta a busca em 100 caracteres, depois do trim', () => {
  assert.equal(ADMIN_USERS_SEARCH_MAX_LENGTH, 100);
  const query = adminUsersQuery({ search: `    ${'a'.repeat(100)}b`, filter: 'ALL' });
  assert.equal(params(query).get('search'), 'a'.repeat(100));
});

test('adminUsersQuery: codifica espaço, &, _ e acento', () => {
  const search = 'josé maria & cia_ltda';
  const query = adminUsersQuery({ search, filter: 'ALL' });
  assert.equal(query, 'search=jos%C3%A9+maria+%26+cia_ltda');
  assert.equal(params(query).get('search'), search);
});

test('adminUsersQuery: cursor só quando presente', () => {
  for (const cursor of [undefined, null, '']) {
    assert.equal(params(adminUsersQuery({ search: '', filter: 'ALL', cursor })).has('cursor'), false);
  }
  const cursor = 'MjAyNi0xMS0xMHxhYmM+/w==';
  assert.equal(params(adminUsersQuery({ search: '', filter: 'ALL', cursor })).get('cursor'), cursor);
});

test('adminUserRowProps: ACTIVE leva eventCount e reportCount', () => {
  assert.deepEqual(plain(adminUserRowProps(user({ event_count: 3, report_count: 1 }))), {
    name: 'Ana Costa',
    moderationStatus: 'ACTIVE',
    eventCount: 3,
    reportCount: 1,
  });
});

test('adminUserRowProps: SUSPENDED com data válida usa dd/MM e não leva summary', () => {
  const props = adminUserRowProps(user({ moderation_status: 'SUSPENDED', suspended_until: MIDDAY, report_count: 2 }));
  assert.equal(props.summary, undefined);
  assert.deepEqual(plain(props), {
    name: 'Ana Costa',
    moderationStatus: 'SUSPENDED',
    untilDate: '20/11',
    reportCount: 2,
  });
});

test('adminUserRowProps: SUSPENDED com data nula ou inválida mostra só as denúncias', () => {
  for (const suspended_until of [null, 'nao-e-data']) {
    assert.deepEqual(plain(adminUserRowProps(user({ moderation_status: 'SUSPENDED', suspended_until, report_count: 2 }))), {
      name: 'Ana Costa',
      moderationStatus: 'SUSPENDED',
      untilDate: '',
      reportCount: 2,
      summary: '2 denúncias',
    });
  }
});

test('adminUserRowProps: BANNED vai sem data e com o summary de denúncias', () => {
  assert.deepEqual(plain(adminUserRowProps(user({ moderation_status: 'BANNED', report_count: 3 }))), {
    name: 'Ana Costa',
    moderationStatus: 'BANNED',
    untilDate: '',
    reportCount: 3,
    summary: '3 denúncias',
  });
});

test('adminUserRowProps: nome nulo, vazio ou só com espaços usa o texto de conta sem nome', () => {
  assert.equal(UNNAMED_ADMIN_USER, 'Conta sem nome');
  for (const name of [null, '', '   ']) {
    assert.equal(adminUserRowProps(user({ name })).name, UNNAMED_ADMIN_USER);
  }
});

test('adminUserRowProps: pluraliza o summary de denúncias', () => {
  const summaryFor = report_count => adminUserRowProps(user({ moderation_status: 'BANNED', report_count })).summary;
  assert.deepEqual([0, 1, 2, 12].map(summaryFor), ['Nenhuma denúncia', '1 denúncia', '2 denúncias', '12 denúncias']);
});

test('adminUsersAnnouncement: nenhuma, uma e várias contas', () => {
  assert.equal(adminUsersAnnouncement({ count: 0, hasMore: false }), 'Nenhuma conta encontrada');
  assert.equal(adminUsersAnnouncement({ count: 1, hasMore: false }), '1 conta');
  assert.equal(adminUsersAnnouncement({ count: 7, hasMore: false }), '7 contas');
});

test('adminUsersAnnouncement: com mais páginas, avisa que o total é maior', () => {
  assert.equal(adminUsersAnnouncement({ count: 20, hasMore: true }), 'Mais de 20 contas');
});
