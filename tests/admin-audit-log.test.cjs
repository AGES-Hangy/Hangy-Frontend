// Agrupamento por dia da tela de auditoria; a tela fica no QA manual.
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
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(fs.readFileSync(path.join(root, file), 'utf8'), { module: ts.ModuleKind.CommonJS }), context);
  return context.exports;
}

const datetime = load('src/utils/datetime.ts');
const { groupAuditLog } = load('src/utils/adminAuditLog.ts', { '@/utils/datetime': datetime });

// Datas locais, para o teste não depender do fuso da máquina.
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();
const NOW = new Date(2026, 10, 9, 15, 0);
const item = (id, created_at) => ({ audit_log_id: id, summary: `Registro ${id}`, created_at });
const shape = sections => JSON.parse(JSON.stringify(sections)).map(({ title, data }) => [title, data.map(entry => entry.audit_log_id)]);

test('agrupa em HOJE, ONTEM e data, do mais recente para o mais antigo', () => {
  const sections = groupAuditLog([
    item('a', at(9, 14, 32)),
    item('b', at(9, 11, 7)),
    item('c', at(8, 18, 20)),
    item('d', at(5, 16, 55)),
  ], NOW);

  assert.deepEqual(shape(sections), [
    ['HOJE', ['a', 'b']],
    ['ONTEM', ['c']],
    ['05/11/2026', ['d']],
  ]);
});

test('reordena se o backend mandar fora de ordem', () => {
  const sections = groupAuditLog([item('old', at(8, 9)), item('new', at(9, 10)), item('mid', at(9, 8))], NOW);
  assert.deepEqual(shape(sections), [['HOJE', ['new', 'mid']], ['ONTEM', ['old']]]);
});

test('ontem atravessa a virada do mês', () => {
  const sections = groupAuditLog([item('x', new Date(2026, 9, 31, 23).toISOString())], new Date(2026, 10, 1, 8));
  assert.deepEqual(shape(sections), [['ONTEM', ['x']]]);
});

test('data inválida vai para um grupo próprio, no fim', () => {
  const sections = groupAuditLog([item('bad', 'not-a-date'), item('ok', at(9, 9))], NOW);
  assert.deepEqual(shape(sections), [['HOJE', ['ok']], ['DATA DESCONHECIDA', ['bad']]]);
});

test('lista vazia não gera grupo', () => {
  assert.equal(groupAuditLog([], NOW).length, 0);
});
