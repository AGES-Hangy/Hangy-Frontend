import { useCallback, useRef, useState } from 'react';

import { invalidateFeed } from '@/hooks/useFeed';
import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export type BlockResult = 'done' | 'unavailable' | 'failed' | 'ignored';

export function useBlockUser() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const block = useCallback(async (userId: string): Promise<BlockResult> => {
    if (inFlight.current) return 'ignored';
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<void>(endpoints.userBlock(userId), { method: 'POST' });
      invalidateFeed({ discardCache: true });
      return 'done';
    } catch (caught) {
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return 'failed';
      // Já bloqueado: o resultado que a pessoa pediu já vale.
      if (isApiErrorLike(caught) && caught.status === 409) {
        invalidateFeed({ discardCache: true });
        return 'done';
      }
      if (isApiErrorLike(caught) && caught.status === 404) return 'unavailable';

      const failure = describeActionError(caught);
      setError(failure.message);
      addToast({ type: failure.tone, message: failure.message });
      return 'failed';
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [addToast]);

  return { block, isLoading, error };
}
