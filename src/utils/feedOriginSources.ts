import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { endpoints } from '@/constants/api';
import { NOMINATIM_BASE_URL, REQUEST_HEADERS as NOMINATIM_HEADERS } from '@/hooks/useAddressSearch';
import type { CurrentUserResponse } from '@/types/profile';
import { memoizeCityGeocode, type Coordinates, type FeedOriginSources } from '@/utils/feedOrigin';
import { apiFetch } from '@/utils/http';

/** Uma posição de até 15 min basta para medir distâncias de dezenas de km. */
const LAST_KNOWN_MAX_AGE_MS = 15 * 60 * 1000;
/** O GPS frio pode demorar; passado isso, a Home cai na cidade cadastrada. */
const CURRENT_POSITION_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Só consulta a permissão, nunca a pede: o feed não abre o diálogo do sistema.
 * No Web a localização segue sem suporte, como em `useLocationPermission`.
 */
async function getDevicePosition(): Promise<Coordinates | null> {
  if (Platform.OS === 'web') return null;
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
    (await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      CURRENT_POSITION_TIMEOUT_MS,
    ));
  return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
}

async function getProfile() {
  const data = await apiFetch<CurrentUserResponse>(endpoints.me());
  return data.profile ?? null;
}

/** Busca estruturada: com a UF, "Bom Jesus, RS" não vira o Bom Jesus do Piauí. */
async function geocodeCityOnce(city: string, state: string): Promise<Coordinates | null> {
  const params = new URLSearchParams({
    city,
    state,
    country: 'Brasil',
    countrycodes: 'br',
    format: 'jsonv2',
    limit: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
    headers: NOMINATIM_HEADERS,
  });
  if (!response.ok) return null;
  const [first] = (await response.json()) as { lat: string; lon: string }[];
  return first ? { latitude: Number(first.lat), longitude: Number(first.lon) } : null;
}

export const feedOriginSources: FeedOriginSources = {
  getDevicePosition,
  getProfile,
  geocodeCity: memoizeCityGeocode(geocodeCityOnce),
};
