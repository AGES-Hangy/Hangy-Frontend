import { useCallback, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';

/**
 * Encerramento antecipado de um evento em andamento —
 * `PATCH /events/{event_id}/finish`. O status vira `FINISHED` e o `end_date`
 * passa a ser agora; sem esta chamada o evento encerra sozinho no horário.
 *
 * Como o cancelamento, não é otimista: é irreversível, então o diálogo fica
 * em carregamento até a resposta. Devolve `true` só quando o backend confirmou.
 */
export function useFinishEvent(eventId: string | undefined) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const finishEvent = useCallback(async (): Promise<boolean> => {
    if (!eventId) return false;

    setIsLoading(true);

    try {
      await apiFetch(endpoints.eventFinish(eventId), { method: 'PATCH' });
      addToast({ type: 'success', message: 'Evento encerrado.' });
      return true;
    } catch (caught) {
      const failure = describeActionError(caught);
      if (failure.message) addToast({ type: failure.tone, message: failure.message });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addToast, eventId]);

  return { finishEvent, isLoading };
}
