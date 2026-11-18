import type { CurrentUserResponse } from '@/types/profile';

/**
 * De onde o feed da Home mede a distância (`GET /feed?latitude=&longitude=`).
 * Sem dependências de Expo ou rede: quem chama injeta as fontes, e assim a
 * ordem de decisão fica testável em `tests/feed-origin.test.cjs`.
 */
export type Coordinates = { latitude: number; longitude: number };

type Profile = CurrentUserResponse['profile'];

export interface FeedOriginSources {
  /** Posição do aparelho, ou `null` sem permissão de localização concedida. */
  getDevicePosition: () => Promise<Coordinates | null>;
  /** `profile` de `GET /users/me`. */
  getProfile: () => Promise<Profile>;
  /** Centro da cidade cadastrada; `null` quando não encontrada. */
  geocodeCity: (city: string, state: string) => Promise<Coordinates | null>;
}

function isValidCoordinates(value: Partial<Coordinates> | null | undefined): value is Coordinates {
  return (
    value != null &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 &&
    Math.abs(value.longitude) <= 180
  );
}

async function attempt<T>(source: () => Promise<T>): Promise<T | null> {
  try {
    return await source();
  } catch {
    return null;
  }
}

/**
 * 1. A posição exata do aparelho, se a pessoa já deu permissão de localização.
 * 2. Senão, o lugar cadastrado: as coordenadas do estabelecimento ou o centro
 *    da cidade da pessoa física.
 * 3. Senão, `null`: o feed vai sem filtro de distância. Nenhuma falha aqui
 *    impede a Home de carregar.
 */
export async function resolveFeedOrigin(sources: FeedOriginSources): Promise<Coordinates | null> {
  const device = await attempt(sources.getDevicePosition);
  if (isValidCoordinates(device)) return { latitude: device.latitude, longitude: device.longitude };

  const profile = await attempt(sources.getProfile);
  if (!profile) return null;

  if ('cnpj' in profile) {
    const business = { latitude: profile.latitude ?? undefined, longitude: profile.longitude ?? undefined };
    return isValidCoordinates(business) ? business : null;
  }

  const city = profile.city?.trim();
  const state = profile.state?.trim();
  if (!city || !state) return null;
  const cityCenter = await attempt(() => sources.geocodeCity(city, state));
  return isValidCoordinates(cityCenter) ? { latitude: cityCenter.latitude, longitude: cityCenter.longitude } : null;
}

/** `/feed`, com a origem quando houver uma. O raio fica no padrão da API. */
export function feedPath(origin: Coordinates | null): string {
  if (!origin) return '/feed';
  return `/feed?latitude=${origin.latitude.toFixed(6)}&longitude=${origin.longitude.toFixed(6)}`;
}

/**
 * Memoriza o centro de cada cidade enquanto o app está aberto: ele não muda, e
 * o Nominatim pede no máximo 1 req/s. Só acertos ficam guardados, para uma
 * falha de rede não deixar a cidade sem coordenadas até reabrir o app.
 */
export function memoizeCityGeocode(
  geocode: (city: string, state: string) => Promise<Coordinates | null>,
): (city: string, state: string) => Promise<Coordinates | null> {
  const cache = new Map<string, Coordinates>();
  return async (city, state) => {
    const key = `${city.trim().toLocaleLowerCase('pt-BR')}|${state.trim().toLocaleUpperCase('pt-BR')}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const found = await geocode(city, state);
    if (isValidCoordinates(found)) cache.set(key, found);
    return found;
  };
}
