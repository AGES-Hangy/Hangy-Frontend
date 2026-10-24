import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { ConnectionAnswerResult, ConnectionRequestResult } from '@/types/user';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export type ConnectResult =
  | { kind: 'sent'; connectionId: string }
  | { kind: 'conflict' | 'unavailable' | 'failed' | 'ignored' };

/**
 * `gone`: só no `DELETE`, a conexão já não existia, que é o que se pediu.
 * `stale`: a conexão mudou do outro lado (respondida, cancelada ou desfeita);
 * quem chama recarrega o estado real.
 */
export type ConnectionChangeResult = 'done' | 'gone' | 'stale' | 'failed' | 'ignored';

export function useConnectionActions() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Um marcador só para as três ações: requisições cruzadas sobre a mesma
  // conexão poderiam chegar ao servidor fora de ordem.
  const inFlight = useRef(false);

  const connect = useCallback(async (receiverId: string): Promise<ConnectResult> => {
    if (inFlight.current) return { kind: 'ignored' };
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<ConnectionRequestResult>(endpoints.connectionRequests(), {
        method: 'POST',
        body: JSON.stringify({ receiver_id: receiverId }),
      });
      return { kind: 'sent', connectionId: result.connection_id };
    } catch (caught) {
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return { kind: 'failed' };
      if (isApiErrorLike(caught) && caught.status === 409) return { kind: 'conflict' };
      if (isApiErrorLike(caught) && caught.status === 404) return { kind: 'unavailable' };

      const failure = describeActionError(caught);
      setError(failure.message);
      addToast({ type: failure.tone, message: failure.message });
      return { kind: 'failed' };
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [addToast]);

  const change = useCallback(async (connectionId: string, init: RequestInit): Promise<ConnectionChangeResult> => {
    if (inFlight.current) return 'ignored';
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<ConnectionAnswerResult | void>(endpoints.connection(connectionId), init);
      return 'done';
    } catch (caught) {
      if (isApiErrorLike(caught) && caught.status === 401) return 'failed';
      if (isApiErrorLike(caught) && caught.status === 404 && init.method === 'DELETE') return 'gone';
      // 403 (não é mais quem recebeu), 404 (cancelada ou desfeita) e 409 (já respondida).
      if (isApiErrorLike(caught) && (caught.status === 403 || caught.status === 404 || caught.status === 409)) {
        return 'stale';
      }

      const failure = describeActionError(caught);
      setError(failure.message);
      addToast({ type: failure.tone, message: failure.message });
      return 'failed';
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [addToast]);

  /** Confirma ou recusa uma solicitação recebida (task 230 [BE]). */
  const answer = useCallback(
    (connectionId: string, status: ConnectionAnswerResult['status']) =>
      change(connectionId, { method: 'PATCH', body: JSON.stringify({ status }) }),
    [change],
  );

  /** Cancela uma solicitação enviada ou desfaz uma conexão (task 231 [BE]). */
  const remove = useCallback((connectionId: string) => change(connectionId, { method: 'DELETE' }), [change]);

  return { connect, answer, remove, isLoading, error };
}
