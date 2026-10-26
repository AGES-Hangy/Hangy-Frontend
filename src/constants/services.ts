/** URLs públicas; Expo substitui os acessos diretos a process.env no bundle. */
export const IBGE_BASE_URL = (
  process.env.EXPO_PUBLIC_IBGE_BASE_URL?.trim() || 'https://servicodados.ibge.gov.br/api/v1/localidades'
).replace(/\/+$/, '');

export const NOMINATIM_BASE_URL = (
  process.env.EXPO_PUBLIC_NOMINATIM_BASE_URL?.trim() || 'https://nominatim.openstreetmap.org'
).replace(/\/+$/, '');
