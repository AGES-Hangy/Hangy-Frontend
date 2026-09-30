import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Autocomplete e reverse geocode do campo Endereço (aba Empresa) via
 * Nominatim (OpenStreetMap) — pública, sem chave. A política de uso deles
 * pede no máximo 1 req/s, daí o debounce de 500ms em `search`.
 */
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 4;

/**
 * A política do Nominatim exige um User-Agent que identifique o app: o padrão
 * do Android (`okhttp/...`) leva 403, e a busca falhava em silêncio. No Web o
 * navegador não deixa sobrescrever esse header (ele já manda o Referer).
 */
const REQUEST_HEADERS: Record<string, string> = {
  'Accept-Language': 'pt-BR',
  ...(Platform.OS === 'web' ? {} : { 'User-Agent': 'Hangy/1.0 (aplicativo Hangy)' }),
};

/** Limite de `location_name` no evento (o campo de local também usa `maxLength` igual). */
export const SHORT_LABEL_MAX_LENGTH = 120;

export type AddressSuggestion = {
  /** Endereço completo do Nominatim — usado no endereço da empresa. */
  label: string;
  /** Só "lugar, rua, número, cidade" — cabe no limite de `location_name`. */
  shortLabel: string;
  latitude: number;
  longitude: number;
};

type NominatimAddress = Partial<
  Record<'road' | 'pedestrian' | 'footway' | 'house_number' | 'city' | 'town' | 'village' | 'municipality', string>
>;

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: NominatimAddress;
};

/** Corta no último separador que cabe em `max`, sem deixar uma palavra pela metade. */
function clampLabel(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastComma = cut.lastIndexOf(',');
  return (lastComma > 0 ? cut.slice(0, lastComma) : cut).trim();
}

/**
 * Nome do lugar + rua com número + cidade, ex.: "Parque Farroupilha, Avenida
 * José Bonifácio, Porto Alegre". O `display_name` do Nominatim lista bairro,
 * região, estado, CEP e país e passa fácil dos 120 caracteres.
 */
function toShortLabel(result: NominatimResult): string {
  const address = result.address ?? {};
  const road = address.road ?? address.pedestrian ?? address.footway;
  const street = road ? [road, address.house_number].filter(Boolean).join(', ') : undefined;
  const city = address.city ?? address.town ?? address.village ?? address.municipality;
  // Em resultados que são só um endereço, `name` repete a rua (ou o número).
  const place = result.name && result.name !== road && result.name !== address.house_number ? result.name : undefined;

  const parts = [place, street, city].filter((part): part is string => Boolean(part));
  return clampLabel(parts.length > 0 ? parts.join(', ') : result.display_name, SHORT_LABEL_MAX_LENGTH);
}

function toSuggestion(result: NominatimResult): AddressSuggestion {
  return {
    label: result.display_name,
    shortLabel: toShortLabel(result),
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

export function useAddressSearch() {
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: query,
          format: 'jsonv2',
          addressdetails: '1',
          countrycodes: 'br',
          limit: '5',
        });
        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
          headers: REQUEST_HEADERS,
        });
        if (!response.ok) throw new Error('http');

        const data = (await response.json()) as NominatimResult[];
        setResults(data.map(toSuggestion));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<AddressSuggestion | null> => {
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: 'jsonv2',
        addressdetails: '1',
      });
      const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
        headers: REQUEST_HEADERS,
      });
      if (!response.ok) return null;

      const data = (await response.json()) as NominatimResult;
      return toSuggestion(data);
    } catch {
      return null;
    }
  }, []);

  return { results, isLoading, search, reverseGeocode };
}
