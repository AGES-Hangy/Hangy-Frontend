import { useCallback, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/**
 * `gone`: o `DELETE` veio `404` — o desbloqueio já tinha sido feito (em outro
 * aparelho, por exemplo). É o resultado que a pessoa pediu, então quem chama
 * trata como sucesso.
 * `failed`: o item precisa voltar para a lista; `message` diz por quê e
 * `retryable` indica que vale oferecer "Tentar de novo".
 */
export type UnblockResult =
  | { kind: 'done' | 'gone' | 'ignored' | 'expired' }
  | { kind: 'failed'; message: string; retryable: boolean };

/** Desbloqueio (`DELETE /users/{user_id}/block`, task 235 [BE]). */
export function useUnblockUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const unblockUser = useCallback(async (userId: string): Promise<UnblockResult> => {
    if (inFlight.current) return { kind: 'ignored' };
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<void>(endpoints.userBlock(userId), { method: 'DELETE' });
      return { kind: 'done' };
    } catch (caught) {
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return { kind: 'expired' };
      if (isApiErrorLike(caught) && caught.status === 404) return { kind: 'gone' };

      const failure =
        isApiErrorLike(caught) && caught.kind === 'network'
          ? { message: 'Sem conexão com a internet', retryable: false }
          : isApiErrorLike(caught) && caught.kind === 'timeout'
            ? { message: 'A conexão demorou demais', retryable: true }
            : { message: 'Não foi possível desbloquear. Tente de novo.', retryable: false };
      setError(failure.message);
      return { kind: 'failed', ...failure };
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  return { unblockUser, isLoading, error };
}
