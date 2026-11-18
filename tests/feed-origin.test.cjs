const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/feedOrigin.ts'), 'utf8');
const mod = {};
vm.runInNewContext(
  ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }),
  { exports: mod, Math, Number, Map, Promise },
);
const { resolveFeedOrigin, feedPath, memoizeCityGeocode } = mod;

const DEVICE = { latitude: -30.0277, longitude: -51.2287 };
const PORTO_ALEGRE = { latitude: -30.0325, longitude: -51.2304 };
const PERSONAL = { date_of_birth: '2000-04-12', state: 'RS', city: 'Porto Alegre' };
const BUSINESS = { cnpj: '11222333000181', address: 'Av. Independência, 100', latitude: -30.0331, longitude: -51.2093 };

function sources(overrides = {}) {
  const calls = { profile: 0, geocode: [] };
  return {
    calls,
    getDevicePosition: async () => null,
    getProfile: async () => {
      calls.profile += 1;
      return PERSONAL;
    },
    geocodeCity: async (city, state) => {
      calls.geocode.push([city, state]);
      return PORTO_ALEGRE;
    },
    ...overrides,
  };
}

const plain = (value) => (value == null ? value : { ...value });

test('the device position wins when location permission was granted', async () => {
  const deps = sources({ getDevicePosition: async () => DEVICE });
  assert.deepEqual(plain(await resolveFeedOrigin(deps)), DEVICE);
  assert.equal(deps.calls.profile, 0);
  assert.equal(deps.calls.geocode.length, 0);
});

test('without permission a personal account uses its registered city', async () => {
  const deps = sources({ getProfile: async () => ({ ...PERSONAL, city: '  Porto Alegre ', state: ' RS ' }) });
  assert.deepEqual(plain(await resolveFeedOrigin(deps)), PORTO_ALEGRE);
  assert.deepEqual(deps.calls.geocode.map((call) => Array.from(call)), [['Porto Alegre', 'RS']]);
});

test('a failing or invalid device position falls back to the city', async () => {
  for (const getDevicePosition of [
    async () => {
      throw new Error('gps');
    },
    async () => ({ latitude: Number.NaN, longitude: -51 }),
    async () => ({ latitude: 91, longitude: -51 }),
  ]) {
    assert.deepEqual(plain(await resolveFeedOrigin(sources({ getDevicePosition }))), PORTO_ALEGRE);
  }
});

test('a business account uses its own coordinates without geocoding', async () => {
  const deps = sources({ getProfile: async () => BUSINESS });
  assert.deepEqual(plain(await resolveFeedOrigin(deps)), { latitude: BUSINESS.latitude, longitude: BUSINESS.longitude });
  assert.equal(deps.calls.geocode.length, 0);
});

test('without any usable place the feed goes without coordinates', async () => {
  const cases = [
    sources({ getProfile: async () => ({ ...BUSINESS, latitude: null, longitude: null }) }),
    sources({ getProfile: async () => ({ ...PERSONAL, city: '   ' }) }),
    sources({ getProfile: async () => null }),
    sources({
      getProfile: async () => {
        throw new Error('offline');
      },
    }),
    sources({ geocodeCity: async () => null }),
    sources({
      geocodeCity: async () => {
        throw new Error('nominatim');
      },
    }),
  ];
  for (const deps of cases) assert.equal(await resolveFeedOrigin(deps), null);
});

test('feedPath adds the origin only when there is one', () => {
  assert.equal(feedPath(null), '/feed');
  assert.equal(feedPath({ latitude: -30.03251234567, longitude: -51.2 }), '/feed?latitude=-30.032512&longitude=-51.200000');
});

test('the city center is fetched once per city, and failures are retried', async () => {
  const calls = [];
  let fail = true;
  const geocode = memoizeCityGeocode(async (city, state) => {
    calls.push(`${city}|${state}`);
    if (fail) return null;
    return PORTO_ALEGRE;
  });

  assert.equal(await geocode('Porto Alegre', 'RS'), null);
  fail = false;
  assert.deepEqual(plain(await geocode('Porto Alegre', 'RS')), PORTO_ALEGRE);
  assert.deepEqual(plain(await geocode(' porto alegre ', 'rs')), PORTO_ALEGRE);
  assert.equal(calls.length, 2);

  await geocode('Canoas', 'RS');
  assert.equal(calls.length, 3);
});
