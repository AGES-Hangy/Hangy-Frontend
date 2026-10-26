const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

function networkSecurityXml(hostname) {
  // A URL validada fornece o hostname; escape também ao gerar XML.
  const host = hostname.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${host}</domain>
  </domain-config>
</network-security-config>
`;
}

function withAndroidApiHttp(config, { hostname }) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    application.$['android:networkSecurityConfig'] = '@xml/hangy_network_security_config';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'hangy_network_security_config.xml'), networkSecurityXml(hostname));
    return mod;
  }]);
}
module.exports = withAndroidApiHttp;
module.exports.networkSecurityXml = networkSecurityXml;
