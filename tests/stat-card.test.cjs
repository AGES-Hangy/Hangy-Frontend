// Funções puras do StatCard (cores por tom e rótulo acessível); a renderização fica no QA manual.
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
const { hasSupport, statCardToneColors, statCardAccessibilityLabel } = evaluate(
  functions('src/components/StatCard/index.tsx', ['hasSupport', 'statCardToneColors', 'statCardAccessibilityLabel']),
  { exports: {} },
);
// colors.ts não tem imports, então dá para avaliar o arquivo inteiro e comparar com os tokens reais.
const { colors, palette } = evaluate(fs.readFileSync(path.join(root, 'src/constants/colors.ts'), 'utf8'), { exports: {} }).exports;
const plain = value => JSON.parse(JSON.stringify(value));
const neutral = { backgroundColor: colors.surface.card, borderColor: colors.border.default, valueColor: colors.text.primary };

test('Neutral uses the card surface, the default border and the primary text', () => {
  assert.deepEqual(plain(statCardToneColors('Neutral', colors, palette)), neutral);
});
test('Alert uses the error palette', () => {
  assert.deepEqual(plain(statCardToneColors('Alert', colors, palette)), {
    backgroundColor: palette.error.bg,
    borderColor: palette.error.border,
    valueColor: palette.error.default,
  });
});
test('Success uses the success palette', () => {
  assert.deepEqual(plain(statCardToneColors('Success', colors, palette)), {
    backgroundColor: palette.success.bg,
    borderColor: palette.success.border,
    valueColor: palette.success.default,
  });
});
test('missing tone falls back to Neutral', () => {
  assert.deepEqual(plain(statCardToneColors(undefined, colors, palette)), neutral);
});
test('empty, blank or missing support counts as absent', () => {
  for (const support of ['', '   ', undefined]) assert.equal(hasSupport(support), false);
  assert.equal(hasSupport('+4 nas últimas 24h'), true);
});
test('accessibility label joins label, value and support', () => {
  assert.equal(statCardAccessibilityLabel('Denúncias pendentes', '12', '+4 nas últimas 24h'), 'Denúncias pendentes, 12, +4 nas últimas 24h');
});
test('accessibility label leaves out missing or blank support', () => {
  for (const support of [undefined, '', '   ']) {
    assert.equal(statCardAccessibilityLabel('Denúncias pendentes', '12', support), 'Denúncias pendentes, 12');
  }
});
test('accessibility label keeps numeric values as given, including 0', () => {
  assert.equal(statCardAccessibilityLabel('Denúncias pendentes', 0, undefined), 'Denúncias pendentes, 0');
  assert.equal(statCardAccessibilityLabel('Usuários ativos', 1234, 'Hoje'), 'Usuários ativos, 1234, Hoje');
  assert.equal(statCardAccessibilityLabel('Usuários ativos', '1.234', 'Hoje'), 'Usuários ativos, 1.234, Hoje');
});
