// Funções puras do painel administrativo; a tela fica no QA manual.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
// Terça, 03/11/2026, 12:00 UTC: o "agora" de `formatRelativeTime`.
const NOW = Date.parse('2026-11-03T12:00:00Z');
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [NOW]));
  }
  static now() {
    return NOW;
  }
}

function load(file, imports = {}) {
  const context = {
    exports: {},
    require: id => {
      assert.ok(imports[id], `unexpected import ${id}`);
      return imports[id];
    },
    Date: FixedDate,
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync(path.join(root, file), 'utf8'), { module: ts.ModuleKind.CommonJS }), context);
  return context.exports;
}

const datetime = load('src/utils/datetime.ts');
const {
  dashboardStats, formatCount, recentReportCard, reportReasonLabel, reportSubtitle, reportTargetName, reportTargetOf,
} = load('src/utils/adminDashboard.ts', { '@/utils/datetime': datetime });

// Objetos criados no `vm` têm outro `Object.prototype`, e o `deepEqual` estrito compara protótipos.
const plain = value => JSON.parse(JSON.stringify(value));
const ago = ms => new Date(NOW - ms).toISOString();
const HOUR = 60 * 60 * 1000;

const FIGMA = {
  reports_open: 12,
  reports_open_last_24h: 4,
  reports_in_review: 4,
  reports_in_review_moderators: 2,
  active_users: 4821,
  active_users_new_this_week: 126,
  suspended_accounts: 6,
  suspended_accounts_expiring_today: 2,
  recent_reports: [],
};
const ZERO = {
  reports_open: 0,
  reports_open_last_24h: 0,
  reports_in_review: 0,
  reports_in_review_moderators: 0,
  active_users: 0,
  active_users_new_this_week: 0,
  suspended_accounts: 0,
  suspended_accounts_expiring_today: 0,
  recent_reports: [],
};

test('formatCount groups thousands with a dot', () => {
  assert.deepEqual([0, 999, 1000, 4821, 1234567].map(formatCount), ['0', '999', '1.000', '4.821', '1.234.567']);
});

test('dashboardStats follows the Figma grid', () => {
  assert.deepEqual(plain(dashboardStats(FIGMA)), [
    { key: 'reportsOpen', label: 'Denúncias abertas', value: '12', support: '+4 nas últimas 24 h', tone: 'Alert' },
    { key: 'reportsInReview', label: 'Em análise', value: '4', support: 'por 2 moderadores', tone: 'Neutral' },
    { key: 'activeUsers', label: 'Usuários ativos', value: '4.821', support: '+126 esta semana', tone: 'Neutral' },
    { key: 'suspendedAccounts', label: 'Contas suspensas', value: '6', support: '2 expiram hoje', tone: 'Neutral' },
  ]);
});

test('with everything at zero, nothing is an alert and no card has support', () => {
  const stats = dashboardStats(ZERO);
  assert.deepEqual(plain(stats), [
    { key: 'reportsOpen', label: 'Denúncias abertas', value: '0', tone: 'Neutral' },
    { key: 'reportsInReview', label: 'Em análise', value: '0', tone: 'Neutral' },
    { key: 'activeUsers', label: 'Usuários ativos', value: '0', tone: 'Neutral' },
    { key: 'suspendedAccounts', label: 'Contas suspensas', value: '0', tone: 'Neutral' },
  ]);
  // O JSON acima não distingue `support: undefined` de chave ausente.
  for (const item of stats) assert.equal('support' in item, false, item.key);
});

test('support texts agree in number', () => {
  const stats = plain(dashboardStats({ ...ZERO, reports_in_review_moderators: 1, suspended_accounts_expiring_today: 1 }));
  assert.equal(stats[1].support, 'por 1 moderador');
  assert.equal(stats[3].support, '1 expira hoje');
});

test('support counts group thousands too', () => {
  assert.equal(dashboardStats({ ...ZERO, active_users_new_this_week: 1500 })[2].support, '+1.500 esta semana');
});

test('every report reason has a label', () => {
  const labels = {
    HARASSMENT: 'Assédio ou intimidação',
    SPAM: 'Spam ou golpe',
    HATE_SPEECH: 'Discurso de ódio',
    FAKE_PROFILE: 'Perfil falso',
    INAPPROPRIATE_CONTENT: 'Conteúdo inapropriado',
    SAFETY_CONCERN: 'Violação de segurança',
    MISLEADING_EVENT: 'Evento enganoso',
    OTHER: 'Outro',
  };
  for (const [reason, label] of Object.entries(labels)) assert.equal(reportReasonLabel(reason), label, reason);
});

test('unknown reasons fall back to "Outro", even names inherited from Object', () => {
  assert.equal(reportReasonLabel('NEW_REASON'), 'Outro');
  assert.equal(reportReasonLabel('toString'), 'Outro');
});

test('businesses and missing targets use the person card', () => {
  assert.deepEqual(['USER', 'BUSINESS', 'EVENT', null].map(reportTargetOf), ['Pessoa', 'Pessoa', 'Evento', 'Pessoa']);
});

test('a missing name falls back by target type', () => {
  assert.equal(reportTargetName('USER', null), 'Usuário sem nome');
  assert.equal(reportTargetName('BUSINESS', null), 'Estabelecimento sem nome');
  assert.equal(reportTargetName('EVENT', null), 'Evento sem título');
  assert.equal(reportTargetName(null, null), 'Alvo indisponível');
});

test('a present name is kept and a blank one counts as missing', () => {
  assert.equal(reportTargetName('USER', 'Lucas Ferreira'), 'Lucas Ferreira');
  assert.equal(reportTargetName('USER', '   '), 'Usuário sem nome');
});

test('the subtitle counts reports and says how long ago', () => {
  assert.equal(reportSubtitle(1, ago(2 * HOUR)), '1 denúncia · há 2 h');
  assert.equal(reportSubtitle(3, ago(2 * HOUR)), '3 denúncias · há 2 h');
  assert.equal(reportSubtitle(3, ago(30 * 1000)), '3 denúncias · agora');
  assert.equal(reportSubtitle(3, 'not a date'), '3 denúncias');
});

test('recentReportCard maps the Figma example and keeps the backend status', () => {
  const card = recentReportCard({
    report_id: '6f1c2a4e-0000-4000-8000-000000001042',
    target_type: 'USER',
    target_name: 'Lucas Ferreira',
    report_count: 3,
    status: 'REVIEWED',
    reason: 'HARASSMENT',
    description_excerpt: 'Ele mandou mensagens ofensivas no chat do evento.',
    opened_at: ago(2 * HOUR),
  });
  assert.deepEqual(plain(card), {
    target: 'Pessoa',
    targetName: 'Lucas Ferreira',
    targetImageUrl: null,
    subtitle: '3 denúncias · há 2 h',
    moderationStatus: 'REVIEWED',
    reason: 'Assédio ou intimidação',
    descriptionExcerpt: 'Ele mandou mensagens ofensivas no chat do evento.',
  });
  assert.equal('reportNumber' in card, false);
});
