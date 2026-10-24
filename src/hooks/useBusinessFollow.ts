import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export type FollowResult = 'done' | 'unavailable' | 'failed' | 'ignored';

export function useBusinessFollow() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Um marcador só para seguir e deixar de seguir: as duas requisições
  // cruzadas poderiam chegar ao servidor fora de ordem.
  const inFlight = useRef(false);

  const request = useCallback(async (businessId: string, method: 'POST' | 'DELETE'): Promise<FollowResult> => {
    if (inFlight.current) return 'ignored';
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<void>(endpoints.businessFollow(businessId), { method });
      return 'done';
    } catch (caught) {
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return 'failed';
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

  const follow = useCallback((businessId: string) => request(businessId, 'POST'), [request]);
  const unfollow = useCallback((businessId: string) => request(businessId, 'DELETE'), [request]);

  return { follow, unfollow, isLoading, error };
}
