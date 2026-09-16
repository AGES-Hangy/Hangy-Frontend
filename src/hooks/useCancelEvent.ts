import { useCallback, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';

/**
 * Cancelamento de um evento — `PATCH /events/{event_id}/cancel` (task 209).
 * O backend exige um `reason` (1-1000 caracteres) no corpo.
 *
 * Devolve `true` só quando o backend confirmou; a tela usa isso para decidir
 * se navega para fora. Nada de otimismo aqui: cancelar avisa todo mundo e é
 * irreversível, então o diálogo fica em carregamento até a resposta chegar.
 */
export function useCancelEvent(eventId: string | undefined) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const cancelEvent = useCallback(async (reason: string): Promise<boolean> => {
    if (!eventId) return false;

    setIsLoading(true);

    try {
      await apiFetch(endpoints.eventCancel(eventId), {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      addToast({ type: 'success', message: 'Evento cancelado. Os confirmados foram avisados.' });
      return true;
    } catch (caught) {
      const failure = describeActionError(caught);
      if (failure.message) addToast({ type: failure.tone, message: failure.message });
      if (failure.readOnly) setIsReadOnly(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addToast, eventId]);

  return { cancelEvent, isLoading, isReadOnly };
}
