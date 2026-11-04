const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

function load(relativePath, modules = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const mod = {};
  vm.runInNewContext(
    ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
    { exports: mod, require: (name) => modules[name], Date, Math, String, Number },
  );
  return mod;
}

const datetime = load('src/utils/datetime.ts');
const {
  isReportOpen,
  previousReportsSummary,
  reportReasonLabel,
  reportStateLine,
  resolutionCopy,
  shortName,
  targetSummary,
} = load('src/utils/adminReport.ts', { '@/utils/datetime': datetime });

function report(overrides = {}) {
  return {
    report_id: 'r1',
    report_number: 1042,
    status: 'REVIEWED',
    opened_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    target: {
      type: 'USER',
      id: 'u1',
      name: 'Lucas Ferreira',
      member_since: '2025-03-14',
      event_count: 12,
      moderation_status: 'ACTIVE',
    },
    reason: 'HARASSMENT',
    description: 'Relato',
    reported_by: { id: 'u2', name: 'Marina Souza' },
    reported_at: new Date().toISOString(),
    previous_reports: { total: 2, archived: 1, resolved_with_action: 1 },
    resolution: null,
    ...overrides,
  };
}

test('only PENDING and REVIEWED reports are open for action', () => {
  assert.equal(isReportOpen('PENDING'), true);
  assert.equal(isReportOpen('REVIEWED'), true);
  assert.equal(isReportOpen('RESOLVED'), false);
  assert.equal(isReportOpen('REJECTED'), false);
});

test('names are shortened to first name and last initial', () => {
  assert.equal(shortName('Marina Souza'), 'Marina S.');
  assert.equal(shortName('Gabriel da Silva Nunes'), 'Gabriel N.');
  assert.equal(shortName('Ana'), 'Ana');
  assert.equal(shortName(null), 'Conta removida');
});

test('unknown reasons fall back instead of showing the raw enum', () => {
  assert.equal(reportReasonLabel('HARASSMENT'), 'Assédio');
  assert.equal(reportReasonLabel('SOMETHING_NEW'), 'Outro motivo');
});

test('target summary follows the current moderation status', () => {
  assert.equal(targetSummary(report()), 'Membro desde 03/2025 · 12 eventos');
  const resolvedAt = new Date(2026, 8, 5, 14, 32).toISOString();
  const banned = report({
    status: 'RESOLVED',
    target: { ...report().target, moderation_status: 'BANNED' },
    resolution: { resolved_by: { id: 'a', name: 'Gabriel Nunes' }, resolved_at: resolvedAt, action: 'BANNED' },
  });
  assert.equal(targetSummary(banned), 'Banido em 05/09 · acesso bloqueado');
});

test('previous reports summary handles empty and plural cases', () => {
  assert.equal(
    previousReportsSummary(report()),
    '2 denúncias anteriores · 1 arquivada e 1 encerrada com ação na conta.',
  );
  assert.equal(
    previousReportsSummary(report({ previous_reports: { total: 0, archived: 0, resolved_with_action: 0 } })),
    'Nenhuma denúncia anterior contra esta conta.',
  );
});

test('state line and resolution card describe who, when and which action', () => {
  assert.equal(reportStateLine(report()), 'Aberta há 2 h');

  const now = new Date();
  const resolvedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 32).toISOString();
  const resolved = report({
    status: 'RESOLVED',
    resolution: { resolved_by: { id: 'a', name: 'Gabriel Nunes' }, resolved_at: resolvedAt, action: 'BANNED' },
  });
  assert.equal(reportStateLine(resolved), 'Encerrada hoje, 14:32');
  assert.deepEqual(
    { ...resolutionCopy(resolved) },
    { title: 'Resolvida por Gabriel N.', text: 'Ação aplicada: banimento permanente da conta.' },
  );

  const archived = { ...resolved, status: 'REJECTED', resolution: { ...resolved.resolution, action: 'ARCHIVED' } };
  assert.equal(reportStateLine(archived), 'Arquivada hoje, 14:32');
  assert.equal(resolutionCopy(archived).title, 'Arquivada por Gabriel N.');
});
