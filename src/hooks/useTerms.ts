import { useCallback, useEffect, useState } from 'react';

import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';

export type Terms = {
  version: string;
  publishedAt: string;
  url: string;
  summary: string;
};

type TermsResponse = {
  version: string;
  published_at: string;
  url: string;
  summary: string;
};

/**
 * Endpoint público (`GET /terms/current`, task 212 [BE] — ainda não subiu),
 * busca uma vez ao montar, nunca lança pra tela — em falha `error` vem
 * preenchido e `terms` fica `null`, e a etapa 2 bloqueia o cadastro (sem
 * termos não há aceite válido).
 *
 * Usa `apiFetch` (não o `fetch` cru de `useLogin`/`useTags`) só pra herdar o
 * stub de `USE_API_MOCKS`/`resolveMock` — dá pra testar o fluxo de cadastro
 * inteiro com `npm run start:stub` sem esperar o backend real.
 */
export function useTerms() {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<TermsResponse>(endpoints.termsCurrent());
      setTerms({
        version: data.version,
        publishedAt: data.published_at,
        url: data.url,
        summary: data.summary,
      });
    } catch {
      setError('Não foi possível carregar os termos. Tente de novo.');
      setTerms(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTerms();
  }, [fetchTerms]);

  return { terms, isLoading, error, refetch: fetchTerms };
}
