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

export type AddressSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
};

type NominatimResult = { display_name: string; lat: string; lon: string };

function toSuggestion(result: NominatimResult): AddressSuggestion {
  return {
    label: result.display_name,
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
          addressdetails: '0',
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
