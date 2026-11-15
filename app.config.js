module.exports = ({ config }) => {
  const owner = process.env.EAS_PROJECT_OWNER?.trim();
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  if (Boolean(owner) !== Boolean(projectId)) {
    throw new Error('Configure EAS_PROJECT_OWNER e EAS_PROJECT_ID juntos.');
  }

  const profile = process.env.EAS_BUILD_PROFILE;
  const allowHttp = process.env.ANDROID_ALLOW_HTTP_API === 'true';
  const apiValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  let apiUrl;
  if (apiValue) {
    try { apiUrl = new URL(apiValue); } catch {
      throw new Error('EXPO_PUBLIC_API_BASE_URL deve ser uma URL HTTP ou HTTPS válida.');
    }
    if (!['http:', 'https:'].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password) {
      throw new Error('A URL da API deve usar HTTP/HTTPS e não conter credenciais.');
    }
  }
  const distributed = ['preview', 'production'].includes(profile);
  if (distributed && (!apiUrl || ['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname))) {
    throw new Error('Defina uma EXPO_PUBLIC_API_BASE_URL acessível pelo celular.');
  }
  if (apiUrl?.protocol === 'http:' && (profile === 'production' || (distributed && !allowHttp))) {
    throw new Error('Produção exige HTTPS; para APK de teste HTTP, configure ANDROID_ALLOW_HTTP_API=true.');
  }
  const httpPlugin = allowHttp && apiUrl?.protocol === 'http:'
    ? [['./plugins/withAndroidApiHttp', { hostname: apiUrl.hostname }]] : [];

  const mapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  // Caminho do google-services.json (FCM). No EAS vem da variável de arquivo
  // GOOGLE_SERVICES_JSON; o arquivo em si nunca é versionado.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();

  // Sem essas credenciais o build Android instala, mas o push não chega e o mapa
  // fica em branco. Produção falha cedo; os demais perfis só avisam.
  const missingAndroid = [
    !googleServicesFile && 'GOOGLE_SERVICES_JSON',
    !mapsApiKey && 'GOOGLE_MAPS_ANDROID_API_KEY',
  ].filter(Boolean);
  if (profile && process.env.EAS_BUILD_PLATFORM !== 'ios' && missingAndroid.length) {
    const message = `Build Android sem ${missingAndroid.join(' e ')}: push e/ou mapa não funcionarão. Veja "Credenciais nativas" no README.`;
    if (profile === 'production') throw new Error(message);
    console.warn(`[app.config] ${message}`);
  }

  return {
    ...config,
    ...(googleServicesFile ? { android: { ...config.android, googleServicesFile } } : {}),
    ...((mapsApiKey || httpPlugin.length) ? { plugins: [
      ...(config.plugins || []),
      ...httpPlugin,
      ...(mapsApiKey ? [['react-native-maps', { androidGoogleMapsApiKey: mapsApiKey }]] : []),
    ] } : {}),
    owner: owner || config.owner,
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, projectId: projectId || config.extra?.eas?.projectId },
    },
  };
};
