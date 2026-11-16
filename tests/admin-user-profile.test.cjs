// Textos da ficha de moderação a partir do contrato de GET /admin/users/{id}.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const context = { exports: {}, require: id => assert.fail(`unexpected import ${id}`) };
vm.createContext(context);
vm.runInContext(
  ts.transpile(fs.readFileSync(path.join(root, 'src/utils/adminUserProfile.ts'), 'utf8'), { module: ts.ModuleKind.CommonJS }),
  context,
);
const { adminUserName, memberSinceLabel, moderationEntryText, countSupport } = context.exports;

test('conta desde lê a data sem fuso: dia 1º não volta para o mês anterior', () => {
  assert.equal(memberSinceLabel('2025-03-01'), '03/2025');
  assert.equal(memberSinceLabel(''), '');
});

test('conta sem nome ainda tem um rótulo', () => {
  assert.equal(adminUserName({ name: '  ' }), 'Conta sem nome');
  assert.equal(adminUserName({ name: null }), 'Conta sem nome');
  assert.equal(adminUserName({ name: ' Lucas ' }), 'Lucas');
});

test('histórico traduz a ação do backend', () => {
  assert.equal(moderationEntryText({ action: 'BANNED' }), 'Banido permanentemente');
  assert.equal(moderationEntryText({ action: 'SUSPENDED' }), 'Suspenso');
  assert.equal(moderationEntryText({ action: 'REVERTED' }), 'Moderação revertida');
  assert.equal(moderationEntryText({ action: 'NOVA' }), 'Ação de moderação');
});

test('apoio do StatCard some com zero e concorda no plural', () => {
  assert.equal(countSupport(0, 'cancelado', 'cancelados'), undefined);
  assert.equal(countSupport(1, 'procedente', 'procedentes'), '1 procedente');
  assert.equal(countSupport(2, 'procedente', 'procedentes'), '2 procedentes');
});
