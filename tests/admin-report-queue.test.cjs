// Funções puras da fila de denúncias; a tela fica no QA manual.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
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
const { reportQueueCard, reportQueueEmptyCopy, reportQueueTargetLabel, reportQueueTargetName, REPORT_QUEUE_TABS } = load('src/utils/adminReportQueue.ts', {
  '@/utils/adminDashboard': load('src/utils/adminDashboard.ts', { '@/utils/datetime': datetime }),
  '@/utils/adminReport': load('src/utils/adminReport.ts', { '@/utils/datetime': datetime }),
});

const plain = value => JSON.parse(JSON.stringify(value));
const item = overrides => ({
  report_id: 'r1',
  report_number: 1042,
  target_type: 'USER',
  target_name: 'Lucas Ferreira',
  report_count: 3,
  status: 'REVIEWED',
  reason: 'HARASSMENT',
  description_excerpt: 'Trecho do relato',
  opened_at: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

test('as abas seguem o frame e deixam as arquivadas de fora', () => {
  assert.deepEqual(plain(REPORT_QUEUE_TABS).map(tab => tab.value), ['PENDING', 'REVIEWED', 'RESOLVED']);
});

test('o card traz número, contagem e o motivo traduzido', () => {
  const card = reportQueueCard(item());
  assert.equal(card.target, 'Pessoa');
  assert.equal(card.reportNumber, 1042);
  assert.equal(card.reason, 'Assédio');
  assert.match(card.subtitle, /^3 denúncias · /);
});

test('denúncia de evento usa o card de evento', () => {
  assert.equal(reportQueueCard(item({ target_type: 'EVENT', target_name: 'Churrasco' })).target, 'Evento');
});

test('estabelecimento usa o card de pessoa e alvo removido não quebra', () => {
  assert.equal(reportQueueCard(item({ target_type: 'BUSINESS' })).target, 'Pessoa');
  assert.equal(reportQueueCard(item({ target_type: null, target_name: null })).targetName, 'Alvo indisponível');
});

test('o nome do chip ignora linhas de outro tipo de alvo', () => {
  const evento = item({ target_type: 'EVENT', target_name: 'Churrasco' });
  assert.equal(reportQueueTargetName([evento, item()], false), 'Lucas Ferreira');
  assert.equal(reportQueueTargetName([item(), evento], true), 'Churrasco');
  assert.equal(reportQueueTargetName([], false), null);
});

test('o chip só existe com filtro e cai no genérico sem nome', () => {
  const none = { targetName: null, targetUserId: null, targetEventId: null };
  assert.equal(reportQueueTargetLabel(none), null);
  assert.equal(reportQueueTargetLabel({ ...none, targetUserId: 'u1' }), 'Denúncias deste usuário');
  assert.equal(reportQueueTargetLabel({ ...none, targetEventId: 'e1' }), 'Denúncias deste evento');
  assert.equal(reportQueueTargetLabel({ ...none, targetUserId: 'u1', targetName: 'Lucas' }), 'Denúncias de Lucas');
});

test('o estado vazio prioriza busca, depois alvo, depois a aba', () => {
  const base = { tab: 'PENDING', search: '', isTargeted: false };
  assert.equal(reportQueueEmptyCopy(base).title, 'Nenhuma denúncia pendente');
  assert.equal(reportQueueEmptyCopy({ ...base, tab: 'RESOLVED' }).title, 'Nenhuma denúncia por aqui');
  assert.equal(reportQueueEmptyCopy({ ...base, isTargeted: true }).text, 'Não há denúncias deste alvo nesta aba.');
  assert.equal(reportQueueEmptyCopy({ ...base, search: 'ana', isTargeted: true }).title, 'Nenhuma denúncia encontrada');
});
