import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { ReportReason, ReportTarget } from '@/types/report';
import { apiFetch } from '@/utils/http';

/**
 * Motivos de denúncia de um alvo — `GET /reports/reasons` (tasks 089 e 296).
 *
 * ```tsx
 * const { reasons, isLoading, error, reload } = useReportReasons('EVENT', id);
 * ```
 *
 * Quais motivos estão disponíveis vem pronto da API (`available` e
 * `unavailable_reason`); a tela não deduz nada. `error` é o erro cru, para a
 * tela traduzir com `describeReportError`.
 */
export function useReportReasons(target: ReportTarget | undefined, targetId: string | undefined) {
  const [reasons, setReasons] = useState<ReportReason[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Alvo a que `reasons`/`error` se referem. A tela é reaproveitada entre
  // alvos, e no render em que o alvo muda o estado ainda é o do anterior.
  const key = `${target}:${targetId}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  // Só a última requisição escreve no estado: o recarregamento depois de um
  // 409 pode cruzar com uma resposta mais antiga.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (!target || !targetId) {
      setLoadedKey(key);
      setIsLoading(false);
      setError({ kind: 'http', status: 404, detail: 'Target not found' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<ReportReason[]>(endpoints.reportReasons(target, targetId));
      if (requestId !== latestRequest.current) return;
      setReasons(result);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(caught);
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedKey(key);
        setIsLoading(false);
      }
    }
  }, [key, target, targetId]);

  // No foco, e não na montagem: o navegador de abas mantém a tela montada, e
  // ao voltar para ela os motivos precisam refletir a denúncia que acabou de
  // ser enviada. A lista anterior some para o skeleton não mostrar dado velho.
  useFocusEffect(
    useCallback(() => {
      setReasons(null);
      void load();
      return () => {
        ++latestRequest.current;
      };
    }, [load]),
  );

  // Enquanto o estado for de outro alvo, mostra carregando em vez dele.
  const isStale = loadedKey !== key;

  return {
    reasons: isStale ? null : reasons,
    isLoading: isLoading || isStale,
    error: isStale ? null : error,
    reload: load,
  };
}
