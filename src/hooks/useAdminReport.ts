import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { AdminReportDetail } from '@/types/adminReport';
import { describeReportLoadError, type LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

type LoadedReport = { id: string; report: AdminReportDetail } | null;

/** Campos que uma ação de moderação muda na denúncia, aplicados sem novo `GET`. */
export type AdminReportPatch = Partial<Pick<AdminReportDetail, 'status' | 'resolution'>> & {
  moderationStatus?: AdminReportDetail['target']['moderation_status'];
};

/**
 * Detalhe de uma denúncia (`GET /admin/reports/{id}`).
 *
 * Depois de banir, suspender ou arquivar a tela não navega: `patchReport`
 * troca o estado no lugar (Aberta → Resolvida) e o status da conta no mesmo
 * render, sem buscar de novo.
 */
export function useAdminReport(reportId: string | undefined) {
  // A denúncia fica guardada com o id a que pertence: a de outro id nunca é
  // exibida, nem enquanto a do id novo carrega.
  const [loaded, setLoaded] = useState<LoadedReport>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const latestRequest = useRef(0);

  /** Resolve `true` quando a denúncia chegou; `false` em erro ou resposta descartada. */
  const load = useCallback(async (): Promise<boolean> => {
    const requestId = ++latestRequest.current;

    if (!reportId) {
      setIsLoading(false);
      setError(describeReportLoadError({ kind: 'http', status: 404, detail: 'Report not found' }));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const report = await apiFetch<AdminReportDetail>(endpoints.adminReport(reportId));
      if (requestId !== latestRequest.current) return false;
      setLoaded({ id: reportId, report });
      return true;
    } catch (caught) {
      if (requestId !== latestRequest.current) return false;
      const loadError = describeReportLoadError(caught);
      if (loadError.kind === 'unavailable') setLoaded(null);
      setError(loadError);
      return false;
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchReport = useCallback(
    ({ moderationStatus, ...changes }: AdminReportPatch) => {
      setLoaded((current) => {
        if (!current || current.id !== reportId) return current;
        const { report } = current;
        return {
          id: current.id,
          report: {
            ...report,
            ...changes,
            target: moderationStatus
              ? { ...report.target, moderation_status: moderationStatus }
              : report.target,
          },
        };
      });
    },
    [reportId],
  );

  return {
    report: loaded && loaded.id === reportId ? loaded.report : null,
    isLoading,
    error,
    reload: load,
    patchReport,
  };
}
