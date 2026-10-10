import { useCallback, useEffect, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { NearbyEventItem, NearbyEventsPage } from '@/types/event';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/** Espera depois do último movimento do mapa antes de buscar — sem isto vira uma requisição por pan. */
const SEARCH_DEBOUNCE_MS = 500;
/** Teto do raio: acima do limite do backend a resposta é `Radius exceeds maximum`. Alinhar com a task 119. */
const MAX_RADIUS_M = 50000;
const EARTH_RADIUS_M = 6371000;

type Coordinate = { latitude: number; longitude: number };

/** Distância em linha reta (haversine), em metros. */
export function distanceInMeters(from: Coordinate, to: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** O raio sai da área visível do mapa (centro até o canto), não de um valor fixo. */
function radiusFor(region: Region) {
  const corner = {
    latitude: region.latitude + region.latitudeDelta / 2,
    longitude: region.longitude + region.longitudeDelta / 2,
  };
  return Math.min(MAX_RADIUS_M, distanceInMeters(region, corner));
}

const RADIUS_EXCEEDED = 'Radius exceeds maximum';
const INVALID_COORDINATES = 'Invalid coordinates';

/**
 * Eventos ao redor do centro do mapa (`GET /events/nearby`). `search` tem
 * debounce; respostas que chegam depois de uma busca mais nova, ou depois de a
 * tela desmontar, são descartadas.
 */
export function useNearbyEvents() {
  const { addToast } = useToast();
  const [events, setEvents] = useState<NearbyEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** Última busca deu certo e voltou vazia — estado "nenhum evento por perto", não é erro. */
  const [isEmpty, setIsEmpty] = useState(false);
  const [isAtMaxRadius, setIsAtMaxRadius] = useState(false);

  const latestRequestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const searchNow = useCallback(
    async (region: Region) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const requestId = ++latestRequestIdRef.current;
      const radiusM = radiusFor(region);
      setIsLoading(true);

      try {
        const page = await apiFetch<NearbyEventsPage>(
          endpoints.eventsNearby({ latitude: region.latitude, longitude: region.longitude, radiusM }),
        );
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;

        const items = page.items ?? [];
        setEvents(items);
        setIsEmpty(items.length === 0);
        setIsAtMaxRadius(radiusM >= MAX_RADIUS_M);
      } catch (error) {
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
        // Erro na busca vira toast; o mapa continua utilizável. O 401 é global
        // (`apiFetch`) e o sem-rede é o `OfflineBanner` da tela.
        if (!isApiErrorLike(error)) {
          addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
        } else if (error.status === 401 || error.kind === 'network') {
          return;
        } else if (error.kind === 'timeout') {
          addToast({
            type: 'error',
            message: 'A conexão demorou demais',
            actionLabel: 'Tentar de novo',
            onAction: () => void searchNow(region),
          });
        } else if (error.detail === RADIUS_EXCEEDED) {
          setIsAtMaxRadius(true);
          addToast({ type: 'warning', message: 'Não dá para ampliar mais o raio' });
        } else if (error.detail === INVALID_COORDINATES) {
          addToast({ type: 'error', message: 'Não conseguimos usar esse endereço. Escolha outro no mapa.' });
        } else {
          addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
        }
      } finally {
        if (isMountedRef.current && requestId === latestRequestIdRef.current) setIsLoading(false);
      }
    },
    [addToast],
  );

  const search = useCallback(
    (region: Region) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void searchNow(region), SEARCH_DEBOUNCE_MS);
    },
    [searchNow],
  );

  /** Atualização local depois de confirmar ou cancelar presença pelo preview. */
  const setConfirmed = useCallback((eventId: string, isConfirmed: boolean) => {
    setEvents((current) =>
      current.map((event) => (event.event_id === eventId ? { ...event, is_confirmed: isConfirmed } : event)),
    );
  }, []);

  return { events, isLoading, isEmpty, isAtMaxRadius, search, searchNow, setConfirmed };
}
