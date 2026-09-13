import { useCallback, useEffect, useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';

export interface EventShare {
  title: string;
  event_date: string;
  location_name: string;
  cover_photo_url: string | null;
  web_url: string;
}

/**
 * Carrega os dados públicos usados imediatamente após a publicação.
 * O endpoint também devolve a URL web que é compartilhada pelo sistema.
 */
export function useEventShare(eventId: string | undefined) {
  const [data, setData] = useState<EventShare | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setData(null);
      setError('Evento não encontrado');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/share`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error('request-failed');

      const payload = (await response.json()) as EventShare;
      setData(payload);
    } catch {
      setData(null);
      setError('Não foi possível carregar o evento publicado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}
