import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { AuditLogItem, AuditLogPage } from '@/types/admin';
import { describeAdminLoadError, endsAdminSession } from '@/utils/adminLoadErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/**
 * Registro das ações administrativas (`GET /admin/audit-log`), da mais recente
 * para a mais antiga. Só a primeira página: o `next_cursor` fica para quando a
 * lista crescer.
 *
 * - Recarrega sempre que a tela volta ao foco: uma ação feita em outra tela do
 *   painel entra no registro.
 * - `isLoading` só liga sem dado na tela; com dado, o recarregamento é silencioso.
 * - `error` só existe quando não há dado para mostrar. Com dado, a falha vira
 *   toast com "Tentar de novo" e o dado fica.
 */
export function useAdminAuditLog() {
  const { addToast } = useToast();
  const [data, setData] = useState<AuditLogItem[] | null>(null);
  // Cópia síncrona de `data`: decide entre erro na tela e toast antes do próximo render.
  const dataRef = useRef<AuditLogItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const latestRequest = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++latestRequest.current;
    let sessionEnded = false;
    setError(null);
    if (!dataRef.current) setIsLoading(true);

    try {
      const { items } = await apiFetch<AuditLogPage>(endpoints.adminAuditLog());
      if (requestId !== latestRequest.current) return;
      dataRef.current = items;
      setData(items);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      if (endsAdminSession(caught)) {
        sessionEnded = true;
        return;
      }

      const loadError = describeAdminLoadError(caught);
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
      // Com a sessão encerrada, o skeleton fica até a troca de tela, sem piscar a tela vazia.
      if (requestId === latestRequest.current && !sessionEnded) setIsLoading(false);
    }
  }, [addToast]);

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  return { data, isLoading, error, refetch };
}
