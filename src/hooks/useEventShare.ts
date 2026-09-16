import { useCallback, useState } from 'react';
import { Share } from 'react-native';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { EventShare } from '@/types/event';
import { apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';
import { formatDateTime } from '@/utils/datetime';

/**
 * Link compartilhável do evento — `GET /events/{event_id}/share` (task de
 * backend 101).
 *
 * Devolve `null` em falha: quem chama já tem o toast do erro e só precisa
 * decidir se abre ou não o share sheet do sistema.
 */
export function useEventShare(eventId: string | undefined) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const getShare = useCallback(async (): Promise<EventShare | null> => {
    if (!eventId) return null;

    setIsLoading(true);

    try {
      return await apiFetch<EventShare>(endpoints.eventShare(eventId));
    } catch (caught) {
      const failure = describeActionError(caught);
      addToast({ type: failure.tone, message: failure.message || 'Não foi possível compartilhar' });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [addToast, eventId]);

  const share = useCallback(async () => {
    const data = await getShare();
    if (!data) return;

    try {
      await Share.share({
        title: data.title,
        message: `${data.title} — ${formatDateTime(data.event_date)} · ${data.location_name}\n${data.web_url}`,
        url: data.web_url,
      });
    } catch {
      addToast({ type: 'error', message: 'Não foi possível abrir o compartilhamento' });
    }
  }, [addToast, getShare]);

  return { getShare, share, isLoading };
}
