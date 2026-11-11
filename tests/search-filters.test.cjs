const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/searchFilters.ts'), 'utf8');
const mod = {};
vm.runInNewContext(
  ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
  { exports: mod, Date, Set, Map, Object, Boolean },
);
const {
  blockApplies, buildTagNameMap, countActiveFilters, formatAppliedDateLabel, fromAppliedFilters, fromDateKey,
  hasActiveAppliedFilters, normalizeFilterValue, resolveDatePreset, toDateKey,
  toNearbyEventFilters, toOffsetIso, validateDateRange,
} = mod;

// Quarta-feira, 28/10/2026, à noite — perto da virada de dia em UTC.
const WEDNESDAY = new Date(2026, 9, 28, 23, 30);

test('date keys use the local day and reject impossible dates', () => {
  assert.equal(toDateKey(WEDNESDAY), '2026-10-28');
  assert.equal(toDateKey(fromDateKey('2026-11-01')), '2026-11-01');
  assert.equal(fromDateKey('2026-02-30'), undefined);
  assert.equal(fromDateKey(undefined), undefined);
});

test('presets resolve to ranges relative to now', () => {
  assert.deepEqual({ ...resolveDatePreset('today', WEDNESDAY) }, { dateFrom: '2026-10-28', dateTo: '2026-10-28' });
  assert.deepEqual({ ...resolveDatePreset('tomorrow', WEDNESDAY) }, { dateFrom: '2026-10-29', dateTo: '2026-10-29' });
  assert.deepEqual({ ...resolveDatePreset('weekend', WEDNESDAY) }, { dateFrom: '2026-10-31', dateTo: '2026-11-01' });
  assert.deepEqual({ ...resolveDatePreset('weekend', new Date(2026, 9, 31)) }, { dateFrom: '2026-10-31', dateTo: '2026-11-01' });
  assert.deepEqual({ ...resolveDatePreset('weekend', new Date(2026, 10, 1)) }, { dateFrom: '2026-11-01', dateTo: '2026-11-01' });
});

test('custom range must be in the future and in order', () => {
  assert.equal(validateDateRange('2026-11-01', '2026-11-15', WEDNESDAY), null);
  assert.equal(validateDateRange('2026-11-01', undefined, WEDNESDAY), null);
  assert.equal(validateDateRange('2026-10-27', undefined, WEDNESDAY).field, 'dateFrom');
  assert.equal(validateDateRange('2026-11-15', '2026-11-01', WEDNESDAY).field, 'dateTo');
});

test('normalize recalculates presets and drops what does not apply', () => {
  const stale = { datePreset: 'today', dateFrom: '2026-10-01', dateTo: '2026-10-01', tagIds: ['a', 'a'] };
  assert.deepEqual(
    { ...normalizeFilterValue(stale, 'Live', WEDNESDAY), tagIds: [...normalizeFilterValue(stale, 'Live', WEDNESDAY).tagIds] },
    { datePreset: 'today', dateFrom: '2026-10-28', dateTo: '2026-10-28', tagIds: ['a'] },
  );

  const people = { datePreset: 'tomorrow', maxDistanceKm: 5, resultType: 'people', tagIds: [] };
  assert.deepEqual(Object.keys(normalizeFilterValue(people, 'Search', WEDNESDAY)).sort(), ['resultType', 'tagIds']);

  const live = { resultType: 'events', maxDistanceKm: 5, tagIds: [] };
  assert.deepEqual(Object.keys(normalizeFilterValue(live, 'Live', WEDNESDAY)), ['tagIds']);

  const emptyCustom = { datePreset: 'custom', tagIds: [] };
  assert.equal(normalizeFilterValue(emptyCustom, 'Search', WEDNESDAY).datePreset, undefined);
});

test('blocks know which result types they filter', () => {
  assert.equal(blockApplies('date', undefined), true);
  assert.equal(blockApplies('date', 'businesses'), false);
  assert.equal(blockApplies('distance', 'businesses'), true);
  assert.equal(blockApplies('distance', 'people'), false);
});

test('active filter count is one per block', () => {
  assert.equal(countActiveFilters({ tagIds: [] }), 0);
  assert.equal(countActiveFilters({ datePreset: 'custom', tagIds: [] }), 0);
  assert.equal(countActiveFilters({ datePreset: 'weekend', tagIds: ['a', 'b'], maxDistanceKm: 5 }), 3);
});

const TAGS = [
  { id: 'macro-0', name: 'Esportes', type: 'MACRO', children: [{ id: 'micro-0-0', name: 'Futebol', type: 'MICRO' }] },
  { id: 'macro-1', name: 'Música', type: 'MACRO', children: [{ id: 'micro-1-0', name: 'Rock', type: 'MICRO' }] },
];

/** Offset local no formato `±HH:MM`, para o teste valer em qualquer fuso. */
function localOffset(date) {
  const minutes = -date.getTimezoneOffset();
  const abs = Math.abs(minutes);
  return `${minutes >= 0 ? '+' : '-'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

test('offset ISO keeps the local wall clock and the same instant', () => {
  const date = new Date(2026, 10, 4, 9, 5, 7, 42);
  const iso = toOffsetIso(date);
  assert.equal(iso, `2026-11-04T09:05:07.042${localOffset(date)}`);
  assert.equal(new Date(iso).getTime(), date.getTime());
});

test('nearby filters turn days into local day bounds', () => {
  const filters = toNearbyEventFilters(
    { tagIds: [], datePreset: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-15' },
    TAGS,
    WEDNESDAY,
  );
  assert.equal(new Date(filters.startsFrom).getTime(), new Date(2026, 10, 1).getTime());
  assert.equal(new Date(filters.startsUntil).getTime(), new Date(2026, 10, 15, 23, 59, 59, 999).getTime());
  assert.deepEqual([...filters.tagIds], []);

  const onlyFrom = toNearbyEventFilters({ tagIds: [], datePreset: 'custom', dateFrom: '2026-11-01' }, TAGS, WEDNESDAY);
  assert.equal(onlyFrom.startsUntil, undefined);
  const noDate = toNearbyEventFilters({ tagIds: [] }, TAGS, WEDNESDAY);
  assert.equal(noDate.startsFrom, undefined);
  assert.equal(noDate.startsUntil, undefined);
});

test('nearby filters recompute presets for now', () => {
  // "Hoje" aplicado ontem continua sendo hoje.
  const stale = { tagIds: [], datePreset: 'today', dateFrom: '2026-10-27', dateTo: '2026-10-27' };
  const filters = toNearbyEventFilters(stale, TAGS, WEDNESDAY);
  assert.equal(new Date(filters.startsFrom).getTime(), new Date(2026, 9, 28).getTime());
  assert.equal(new Date(filters.startsUntil).getTime(), new Date(2026, 9, 28, 23, 59, 59, 999).getTime());
});

test('nearby filters drop a macro narrowed by one of its micro tags', () => {
  const filters = toNearbyEventFilters({ tagIds: ['macro-0', 'micro-0-0', 'macro-1'] }, TAGS, WEDNESDAY);
  assert.deepEqual([...filters.tagIds], ['micro-0-0', 'macro-1']);
});

test('applied_filters round-trips to FilterValue and active chip labels', () => {
  assert.equal(hasActiveAppliedFilters(null), false);
  assert.equal(hasActiveAppliedFilters({ tag_ids: [], date_from: null, date_to: null }), false);
  assert.equal(hasActiveAppliedFilters({ tag_ids: ['macro-0'], date_from: null, date_to: null }), true);
  assert.equal(hasActiveAppliedFilters({ tag_ids: [], date_from: '2026-10-28', date_to: null }), true);

  const todayApplied = { tag_ids: ['macro-0', 'micro-0-0'], date_from: '2026-10-28', date_to: '2026-10-28' };
  const fromToday = fromAppliedFilters(todayApplied, WEDNESDAY);
  assert.deepEqual(
    { ...fromToday, tagIds: [...fromToday.tagIds] },
    { datePreset: 'today', dateFrom: '2026-10-28', dateTo: '2026-10-28', tagIds: ['macro-0', 'micro-0-0'] },
  );
  assert.equal(formatAppliedDateLabel(todayApplied, WEDNESDAY), 'Hoje');

  const tomorrowApplied = { tag_ids: [], date_from: '2026-10-29', date_to: '2026-10-29' };
  assert.equal(formatAppliedDateLabel(tomorrowApplied, WEDNESDAY), 'Amanhã');

  const weekendApplied = { tag_ids: [], date_from: '2026-10-31', date_to: '2026-11-01' };
  assert.equal(formatAppliedDateLabel(weekendApplied, WEDNESDAY), 'Este fim de semana');

  const customRange = { tag_ids: [], date_from: '2026-09-01', date_to: '2026-09-07' };
  assert.equal(fromAppliedFilters(customRange, WEDNESDAY).datePreset, 'custom');
  assert.equal(formatAppliedDateLabel(customRange, WEDNESDAY), '01/09 – 07/09');
  assert.equal(formatAppliedDateLabel({ date_from: '2026-09-01', date_to: null }, WEDNESDAY), 'A partir de 01/09');
  assert.equal(formatAppliedDateLabel({ date_from: null, date_to: '2026-09-07' }, WEDNESDAY), 'Até 07/09');

  const nameMap = buildTagNameMap(TAGS);
  assert.equal(nameMap.get('macro-0'), 'Esportes');
  assert.equal(nameMap.get('micro-0-0'), 'Futebol');
});

function extractFunctions(file, names) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const parts = [];
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
      parts.push(node.getText(ast));
    }
    ts.forEachChild(node, visit);
  })(ast);
  return parts.join('\n');
}

const searchScreenHelpers = {};
vm.runInNewContext(
  ts.transpile(
    extractFunctions('src/app/(tabs)/Search/index.tsx', [
      'toSearchEvent',
      'businessDisplayName',
      'businessSubtitle',
      'userDisplayName',
      'userSubtitle',
    ]),
    { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  ),
  searchScreenHelpers,
);

test('toSearchEvent preserves public event fields and hides description and participants when is_preview is true', () => {
  const publicEvent = searchScreenHelpers.toSearchEvent({
    event_id: 'aa11',
    title: 'Pelada no Parcão',
    event_date: '2026-09-02T19:00:00Z',
    location_name: 'Parcão',
    privacy: 'PUBLIC',
    is_preview: false,
    description: 'Pelada de sábado, traga a chuteira.',
    participants_count: 12,
    cover_photo_url: 'https://cdn.example/parcao.jpg',
  });
  assert.deepEqual({ ...publicEvent }, {
    id: 'aa11',
    title: 'Pelada no Parcão',
    date: '2026-09-02T19:00:00Z',
    location: 'Parcão',
    imageUrl: 'https://cdn.example/parcao.jpg',
    privacy: 'PUBLIC',
    isPreview: false,
    description: 'Pelada de sábado, traga a chuteira.',
    participantsCount: 12,
  });

  const privatePreview = searchScreenHelpers.toSearchEvent({
    event_id: 'bb22',
    title: 'Aniversário da Ana',
    event_date: '2026-09-10T20:00:00Z',
    location_name: 'Bom Fim',
    location_precision: 'APPROXIMATE',
    privacy: 'PRIVATE',
    is_preview: true,
    description: 'Segredo que não deve aparecer',
    participants_count: 18,
    cover_photo_url: null,
  });
  assert.deepEqual({ ...privatePreview }, {
    id: 'bb22',
    title: 'Aniversário da Ana',
    date: '2026-09-10T20:00:00Z',
    location: 'Bom Fim',
    imageUrl: '',
    privacy: 'PRIVATE',
    isPreview: true,
    description: null,
    participantsCount: null,
  });
});

test('business and user subtitles combine description and location without duplicating strings', () => {
  assert.equal(
    searchScreenHelpers.businessDisplayName({ business_name: 'Planet Futebol Society', name: 'Conta' }),
    'Planet Futebol Society',
  );
  assert.equal(
    searchScreenHelpers.businessSubtitle({
      description: 'Quadras esportivas',
      address: 'Partenon · 3,4 km',
    }),
    'Quadras esportivas · Partenon · 3,4 km',
  );
  assert.equal(
    searchScreenHelpers.businessSubtitle({
      description: 'Quadras esportivas · Partenon',
      address: 'Partenon',
    }),
    'Quadras esportivas · Partenon',
  );

  assert.equal(
    searchScreenHelpers.userSubtitle({
      description: 'Futebol e churrasco',
      city: 'Porto Alegre',
      state: 'RS',
    }),
    'Futebol e churrasco · Porto Alegre, RS',
  );
  assert.equal(
    searchScreenHelpers.userSubtitle({
      description: null,
      city: 'Porto Alegre',
      state: 'RS',
    }),
    'Porto Alegre, RS',
  );
});

function createSearchHost(apiFetch) {
  const slots = [];
  const effects = [];
  const timers = [];
  const toasts = [];
  let cursor = 0;
  let timerSeq = 0;

  const slot = () => cursor++;
  const react = {
    useState: (initial) => {
      const i = slot();
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === 'function' ? value(slots[i]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const i = slot();
      return (slots[i] ||= { current: initial });
    },
    useCallback: (fn, deps) => {
      const i = slot();
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) {
        slots[i] = { fn, deps };
      }
      return slots[i].fn;
    },
    useEffect: (fn, deps) => {
      const i = slot();
      if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) {
        effects.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
      }
    },
  };

  const setTimeoutMock = (fn, delay) => {
    const handle = { id: ++timerSeq, fn, delay, cleared: false };
    timers.push(handle);
    return handle;
  };
  const clearTimeoutMock = (handle) => {
    if (handle) handle.cleared = true;
  };

  class ApiError extends Error {
    constructor(kind, status, detail = null) {
      super(kind);
      this.kind = kind;
      this.status = status;
      this.detail = detail;
    }
  }

  const imports = {
    react,
    '@/components/Toast': { useToast: () => ({ addToast: (t) => toasts.push(t) }) },
    '@/constants/api': {
      endpoints: {
        search: (params) => `search:${JSON.stringify(params)}`,
      },
    },
    '@/utils/apiErrors': {
      describeLoadError: (err) => ({
        kind: err?.kind === 'network' ? 'offline' : err?.kind === 'timeout' ? 'timeout' : 'server',
        title: 'Erro',
        message: 'Falha ao carregar',
      }),
      isApiErrorLike: (err) => err instanceof ApiError,
    },
    '@/utils/http': { apiFetch },
    '@/utils/searchFilters': mod,
  };

  const hookSource = fs.readFileSync(path.join(__dirname, '../src/hooks/useSearch.ts'), 'utf8');
  const context = {
    exports: {},
    require: (id) => {
      assert.ok(imports[id], `unexpected import ${id}`);
      return imports[id];
    },
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    console,
  };
  vm.runInNewContext(
    ts.transpile(hookSource, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
    context,
  );

  return {
    ApiError,
    toasts,
    timers,
    render() {
      cursor = 0;
      const out = context.exports.useSearch();
      while (effects.length) effects.shift()();
      return out;
    },
    runPendingTimers() {
      const active = timers.splice(0, timers.length).filter((t) => !t.cleared);
      for (const t of active) t.fn();
    },
  };
}

function emptySearchResponse(query, applied_filters = { tag_ids: [], date_from: null, date_to: null }) {
  return {
    query,
    applied_filters,
    events: { items: [], total: 0, has_more: false },
    businesses: { items: [], total: 0, has_more: false },
    users: { items: [], total: 0, has_more: false },
  };
}

test('useSearch enforces 2-char minimum without filters, debounces 400ms, and discards stale responses', async () => {
  const calls = [];
  let resolveFirst;
  let resolveSecond;

  const h = createSearchHost((endpoint) => {
    calls.push(endpoint);
    if (calls.length === 1) {
      return new Promise((res) => {
        resolveFirst = res;
      });
    }
    return new Promise((res) => {
      resolveSecond = res;
    });
  });

  // < 2 caracteres sem filtro: permanece no estado inicial e não agenda busca.
  h.render().setQuery('f');
  assert.equal(h.timers.filter((t) => !t.cleared).length, 0);
  assert.equal(calls.length, 0);
  assert.equal(h.render().results, null);

  // >= 2 caracteres: agenda debounce de 400ms.
  h.render().setQuery('fu');
  const activeTimers = h.timers.filter((t) => !t.cleared);
  assert.equal(activeTimers.length, 1);
  assert.equal(activeTimers[0].delay, 400);

  h.runPendingTimers();
  assert.equal(calls.length, 1);
  assert.equal(h.render().isLoading, true);

  // Digitar novo termo enquanto a 1ª requisição está em voo invalida a 1ª.
  h.render().setQuery('futebol');
  h.runPendingTimers();
  assert.equal(calls.length, 2);

  // A resposta antiga chega depois da nova ter sido disparada e deve ser ignorada.
  resolveFirst(emptySearchResponse('fu'));
  await new Promise((r) => setImmediate(r));
  assert.equal(h.render().results, null);

  resolveSecond(emptySearchResponse('futebol'));
  await new Promise((r) => setImmediate(r));
  assert.equal(h.render().results?.query, 'futebol');
  assert.equal(h.render().isLoading, false);
});

test('useSearch supports filter-only search and retries without tags on 404 Tag not found', async () => {
  const calls = [];
  let hostRef;
  const h = createSearchHost(async (endpoint) => {
    calls.push(endpoint);
    if (calls.length === 1) {
      throw new hostRef.ApiError('http', 404, 'Tag not found');
    }
    return emptySearchResponse(null, {
      tag_ids: [],
      date_from: '2026-11-10',
      date_to: '2026-11-10',
    });
  });
  hostRef = h;

  h.render().applyFilters({
    tagIds: ['tag-removida'],
    datePreset: 'custom',
    dateFrom: '2026-11-10',
    dateTo: '2026-11-10',
  });

  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('"tagIds":["tag-removida"]'));
  assert.ok(calls[1].includes('"tagIds":[]'));
  assert.equal(h.toasts.length, 1);
  assert.deepEqual({ ...h.toasts[0] }, {
    type: 'warning',
    message: 'Essa categoria não existe mais',
  });
  assert.deepEqual({ ...h.render().appliedFilters }, {
    tag_ids: [],
    date_from: '2026-11-10',
    date_to: '2026-11-10',
  });
});
