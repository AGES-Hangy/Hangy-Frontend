import { useCallback, useState } from 'react';
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

  const load = useCallback(async () => {
    if (!eventId) {
      setIsLoading(false);
      setError(describeLoadError({ kind: 'http', status: 404, detail: 'Event not found' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setEvent(await apiFetch<EventDetail>(endpoints.event(eventId)));
    } catch (caught) {
      setError(describeLoadError(caught));
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // A gestão muda participantes e contadores. Ao voltar ao detalhe, o foco
  // dispara um novo GET para não mostrar a resposta anterior à aprovação.
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  return { event, isLoading, error, reload: load };
}
