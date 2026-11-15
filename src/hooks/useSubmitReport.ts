import { useCallback, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { ReportCreated, ReportCreateInput } from '@/types/report';
import { apiFetch } from '@/utils/http';

/**
 * Envio da denúncia — `POST /reports` (task 239).
 *
 * ```tsx
 * const { submit, isLoading } = useSubmitReport();
 * ```
 *
 * `submit` resolve com a denúncia criada ou rejeita com o erro cru, para a
 * tela decidir com `describeReportError` se fecha, recarrega ou fica.
 */
export function useSubmitReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Toque duplo no "Enviar" não pode gerar duas denúncias.
  const inFlight = useRef(false);

  const submit = useCallback(async (input: ReportCreateInput): Promise<ReportCreated | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      return await apiFetch<ReportCreated>(endpoints.reports(), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    } catch (caught) {
      setError(caught);
      throw caught;
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  return { submit, isLoading, error };
}
