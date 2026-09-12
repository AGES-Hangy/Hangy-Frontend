import { useCallback, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';

/**
 * Cancelamento de um evento — `POST /events/{event_id}/cancel` (task 209).
 *
 * Devolve `true` só quando o backend confirmou; a tela usa isso para decidir
 * se navega para fora. Nada de otimismo aqui: cancelar avisa todo mundo e é
 * irreversível, então o diálogo fica em carregamento até a resposta chegar.
 */
export function useCancelEvent(eventId: string | undefined) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const cancelEvent = useCallback(async (): Promise<boolean> => {
    if (!eventId) return false;

    setIsLoading(true);

    try {
      await apiFetch(endpoints.eventCancel(eventId), { method: 'POST' });
      addToast({ type: 'success', message: 'Evento cancelado. Os confirmados foram avisados.' });
      return true;
    } catch (caught) {
      const failure = describeActionError(caught);
      if (failure.message) addToast({ type: failure.tone, message: failure.message });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addToast, eventId]);

  return { cancelEvent, isLoading };
}
