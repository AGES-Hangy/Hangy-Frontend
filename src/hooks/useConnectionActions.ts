import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { ConnectionRequestResult } from '@/types/user';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export type ConnectResult = 'sent' | 'conflict' | 'unavailable' | 'failed' | 'ignored';

export function useConnectionActions() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const connect = useCallback(async (receiverId: string): Promise<ConnectResult> => {
    if (inFlight.current) return 'ignored';
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<ConnectionRequestResult>(endpoints.connectionRequests(), {
        method: 'POST',
        body: JSON.stringify({ receiver_id: receiverId }),
      });
      return 'sent';
    } catch (caught) {
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return 'failed';
      if (isApiErrorLike(caught) && caught.status === 409) return 'conflict';
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

  return { connect, isLoading, error };
}
