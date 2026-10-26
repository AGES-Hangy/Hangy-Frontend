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

  return {
    ...config,
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
