const { test } = require('node:test');
const assert = require('node:assert/strict');
const configure = require('../app.config.js');
const base = require('../app.json').expo;
const names = ['EAS_PROJECT_OWNER', 'EAS_PROJECT_ID', 'EAS_BUILD_PROFILE', 'EXPO_PUBLIC_API_BASE_URL', 'GOOGLE_MAPS_ANDROID_API_KEY', 'ANDROID_ALLOW_HTTP_API'];
function withEnv(values, run) {
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) {
      if (values[name] === undefined) delete process.env[name];
      else process.env[name] = values[name];
    }
    run();
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
}
test('local development preserves project and plugins without requiring a remote API', () => {
  withEnv({}, () => assert.deepEqual(configure({ config: base }), base));
});
test('EAS overrides change owner and project together while preserving other config', () => {
  withEnv({ EAS_PROJECT_OWNER: 'test-team', EAS_PROJECT_ID: 'test-id' }, () => {
    const result = configure({ config: base });
    assert.equal(result.owner, 'test-team');
    assert.equal(result.extra.eas.projectId, 'test-id');
    assert.deepEqual(result.plugins, base.plugins);
  });
  withEnv({ EAS_PROJECT_OWNER: 'test-team' }, () => assert.throws(() => configure({ config: base }), /juntos/));
  withEnv({ EAS_PROJECT_ID: 'test-id' }, () => assert.throws(() => configure({ config: base }), /juntos/));
});
test('distributed builds reject missing, malformed, insecure and loopback API URLs', () => {
  for (const profile of ['preview', 'production']) {
    for (const url of [undefined, '', 'invalid', 'http://api.example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]']) {
      withEnv({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_API_BASE_URL: url }, () => assert.throws(() => configure({ config: base })));
    }
    withEnv({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com' }, () => assert.doesNotThrow(() => configure({ config: base })));
  }
});

test('Maps key is wired to the native plugin without replacing existing plugins', () => {
  withEnv({ GOOGLE_MAPS_ANDROID_API_KEY: 'test-key' }, () => {
    const result = configure({ config: base });
    assert.deepEqual(result.plugins.slice(0, -1), base.plugins);
    assert.deepEqual(result.plugins.at(-1), ['react-native-maps', { androidGoogleMapsApiKey: 'test-key' }]);
  });
});

test('preview HTTP is opt-in, scoped to the API host and forbidden in production', () => {
  const env = { EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_API_BASE_URL: 'http://18.223.183.80:8000', ANDROID_ALLOW_HTTP_API: 'true' };
  withEnv(env, () => {
    const result = configure({ config: base });
    assert.deepEqual(result.plugins.at(-1), ['./plugins/withAndroidApiHttp', { hostname: '18.223.183.80' }]);
  });
  withEnv({ ...env, EAS_BUILD_PROFILE: 'production' }, () => assert.throws(() => configure({ config: base }), /HTTPS/));
  withEnv({ ...env, EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com' }, () => {
    assert.deepEqual(configure({ config: base }).plugins, base.plugins);
  });
});
test('HTTP network policy denies cleartext by default and excludes subdomains', () => {
  const { networkSecurityXml } = require('../plugins/withAndroidApiHttp');
  const xml = networkSecurityXml('18.223.183.80');
  assert.match(xml, /base-config cleartextTrafficPermitted="false"/);
  assert.match(xml, /domain includeSubdomains="false">18\.223\.183\.80<\/domain>/);
});
