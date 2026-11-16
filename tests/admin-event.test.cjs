// Textos da ficha de moderação de evento (GET /admin/events/{id}).
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
const { adminEventWhen, adminEventPlace, adminEventStateNotice } = load('src/utils/adminEvent.ts', {
  '@/utils/datetime': datetime,
});

const plain = value => JSON.parse(JSON.stringify(value));

// Datas montadas no fuso local, como o app formata.
const local = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).toISOString();

test('quando: o fim só traz a hora se cair no mesmo dia', () => {
  assert.equal(
    adminEventWhen({ event_date: local(2026, 11, 25, 19, 0), end_date: local(2026, 11, 25, 22, 30) }),
    '25/11/2026 · 19:00 – 22:30',
  );
  assert.equal(
    adminEventWhen({ event_date: local(2026, 11, 25, 22, 0), end_date: local(2026, 11, 26, 2, 0) }),
    '25/11/2026 · 22:00 – 26/11/2026 · 02:00',
  );
});

test('onde: junta nome, bairro e cidade sem partes vazias', () => {
  assert.equal(
    adminEventPlace({ location_name: 'Apê do João', location_neighborhood: 'Santana', location_city: 'Porto Alegre' }),
    'Apê do João · Santana, Porto Alegre',
  );
  assert.equal(adminEventPlace({ location_name: null, location_neighborhood: ' ', location_city: 'Porto Alegre' }), 'Porto Alegre');
  assert.equal(adminEventPlace({ location_name: null, location_neighborhood: null, location_city: null }), '');
});

test('aviso de estado: remoção vence o status do organizador', () => {
  const removed = { moderation_status: 'REMOVED', removed_at: local(2026, 11, 10, 15, 30), status: 'CANCELLED' };
  assert.deepEqual(plain(adminEventStateNotice(removed)), { tone: 'error', text: 'Removido pela moderação em 10/11' });
  assert.deepEqual(plain(adminEventStateNotice({ moderation_status: 'ACTIVE', removed_at: null, status: 'CANCELLED' })), {
    tone: 'neutral',
    text: 'Cancelado pelo organizador',
  });
  assert.equal(adminEventStateNotice({ moderation_status: 'ACTIVE', removed_at: null, status: 'PUBLISHED' }), null);
});
