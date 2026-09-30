import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { EventDetail } from '@/types/event';
import { apiFetch } from '@/utils/http';
import { describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

/**
 * Detalhe de um evento — `GET /events/{event_id}` (task de backend 103).
 *
 * ```tsx
 * const { event, isLoading, error, reload } = useEvent(id);
 * ```
 *
 * O 401 não aparece aqui: é tratado no interceptor de `@/utils/http`, que
 * apaga o token e manda para o Login sozinho.
 */
export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  // Id do evento a que `event`/`error` se referem. A tela do detalhe é
  // reaproveitada entre eventos (as abas ficam montadas), então no render em
  // que o `eventId` muda o estado ainda é o do evento anterior.
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  // Só a última requisição pode escrever no estado: com o foco e a troca de
  // `eventId` disparando cargas seguidas, uma resposta antiga que chegasse por
  // último sobrescreveria o evento certo.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;

    if (!eventId) {
      setLoadedId(eventId);
      setIsLoading(false);
      setEvent(null);
      setError(describeLoadError({ kind: 'http', status: 404, detail: 'Event not found' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<EventDetail>(endpoints.event(eventId));
      if (requestId !== latestRequest.current) return;
      setEvent(result);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeLoadError(caught));
      setEvent(null);
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedId(eventId);
        setIsLoading(false);
      }
    }
  }, [eventId]);

  // A gestão muda participantes e contadores. Ao voltar ao detalhe, o foco
  // dispara um novo GET para não mostrar a resposta anterior à aprovação.
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  // Enquanto o estado for de outro evento, mostra carregando em vez dele.
  const isStale = loadedId !== eventId;

  return {
    event: isStale ? null : event,
    isLoading: isLoading || isStale,
    error: isStale ? null : error,
    reload: load,
  };
}
