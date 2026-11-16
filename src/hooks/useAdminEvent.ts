import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { AdminEventDetail } from '@/types/adminEvent';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

function endsSession(error: unknown) {
  return isApiErrorLike(error) && (error.status === 401 || error.status === 403);
}

function describeEventLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout') return loadError;
  if (loadError.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      title: 'Evento não encontrado',
      message: 'Este evento não existe mais.',
      canRetry: false,
    };
  }
  return describeLoadError(null);
}

/**
 * Ficha de moderação de um evento (`GET /admin/events/{event_id}`), no mesmo
 * padrão da ficha do usuário: recarrega ao voltar o foco e, com dado na tela,
 * a falha vira toast em vez de tirar a ficha.
 */
export function useAdminEvent(eventId: string) {
  const { addToast } = useToast();
  const [data, setData] = useState<AdminEventDetail | null>(null);
  const dataRef = useRef<AdminEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const latestRequest = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++latestRequest.current;
    let sessionEnded = false;
    setError(null);
    if (!dataRef.current) setIsLoading(true);

    try {
      const result = await apiFetch<AdminEventDetail>(endpoints.adminEvent(eventId));
      if (requestId !== latestRequest.current) return;
      dataRef.current = result;
      setData(result);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      if (endsSession(caught)) {
        sessionEnded = true;
        return;
      }
      const loadError = describeEventLoadError(caught);
      if (!dataRef.current) {
        setError(loadError);
        return;
      }
      addToast({
        type: 'error',
        message: loadError.message,
        actionLabel: 'Tentar de novo',
        onAction: () => {
          void refetch();
        },
      });
    } finally {
      if (requestId === latestRequest.current && !sessionEnded) setIsLoading(false);
    }
  }, [addToast, eventId]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return { data, isLoading, error, refetch };
}
