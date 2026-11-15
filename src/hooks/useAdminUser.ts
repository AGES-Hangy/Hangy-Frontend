import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { AdminUserProfile } from '@/types/admin';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

function endsSession(error: unknown) {
  if (!isApiErrorLike(error)) return false;
  return error.status === 401 || error.status === 403;
}

function describeUserLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout') return loadError;
  if (loadError.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      title: 'Usuário não encontrado',
      message: 'Este perfil não está disponível.',
      canRetry: false,
    };
  }
  return describeLoadError(null);
}

/**
 * Ficha do usuário para moderação (`GET /admin/users/{user_id}`).
 *
 * - Recarrega sempre que a tela volta ao foco.
 * - Com dado na tela, falhas de recarregamento viram toast.
 * - Sem dado, a falha substitui o conteúdo.
 */
export function useAdminUser(userId: string) {
  const { addToast } = useToast();
  const [data, setData] = useState<AdminUserProfile | null>(null);
  const dataRef = useRef<AdminUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const latestRequest = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++latestRequest.current;
    let sessionEnded = false;
    setError(null);
    if (!dataRef.current) setIsLoading(true);

    try {
      const result = await apiFetch<AdminUserProfile>(endpoints.adminUser(userId));
      if (requestId !== latestRequest.current) return;
      dataRef.current = result;
      setData(result);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      if (endsSession(caught)) {
        sessionEnded = true;
        return;
      }

      const loadError = describeUserLoadError(caught);
      if (!dataRef.current) {
        setError(loadError);
        return;
      }
      addToast({
        type: 'error',
        message: loadError.message,
        actionLabel: 'Tentar de novo',
        onAction: () => { void refetch(); },
      });
    } finally {
      if (requestId === latestRequest.current && !sessionEnded) setIsLoading(false);
    }
  }, [addToast, userId]);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  return { data, isLoading, error, refetch };
}
