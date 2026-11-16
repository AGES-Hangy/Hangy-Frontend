import { useCallback, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { EventModerationPayload, EventModerationResult } from '@/types/adminReport';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export type RemoveEventResult =
  | { kind: 'done' }
  /** `status` é o HTTP da falha (`null` sem resposta), para a tela reagir a 404 e 409. */
  | { kind: 'failed'; message: string; status: number | null };

function resolveErrorMessage(error: unknown): string {
  if (!isApiErrorLike(error)) return 'Não foi possível remover o evento. Tente de novo.';
  if (error.kind === 'network') return 'Sem conexão com a internet';
  if (error.kind === 'timeout') return 'A conexão demorou demais';
  if (error.status === 404) return 'Este evento não existe mais.';
  if (error.status === 409) return 'Este evento já foi removido.';
  return 'Não foi possível remover o evento. Tente de novo.';
}

/**
 * "Remover evento" a partir da ficha (`PATCH /admin/events/{event_id}/moderation`,
 * sem `report_id`): o backend também encerra as denúncias abertas do evento.
 */
export function useRemoveEvent(eventId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);

  const removeEvent = useCallback(async (): Promise<RemoveEventResult> => {
    if (inFlight.current) return { kind: 'failed', message: 'Ação em andamento', status: null };
    inFlight.current = true;
    setIsLoading(true);
    try {
      const body: EventModerationPayload = { action: 'REMOVE' };
      await apiFetch<EventModerationResult>(endpoints.adminEventModeration(eventId), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return { kind: 'done' };
    } catch (caught) {
      const status = isApiErrorLike(caught) ? caught.status : null;
      return { kind: 'failed', message: resolveErrorMessage(caught), status };
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [eventId]);

  return { removeEvent, isLoading };
}
