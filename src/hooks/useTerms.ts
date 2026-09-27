import { useCallback, useEffect, useState } from 'react';

import { API_BASE_URL, endpoints } from '@/constants/api';

export type Terms = {
  version: string;
  publishedAt: string;
  url: string;
  summary: string;
};

/**
 * Espelha `useTags.ts`: endpoint público (`GET /terms/current`), busca uma
 * vez ao montar, nunca lança pra tela — em falha `error` vem preenchido e
 * `terms` fica `null`, e a etapa 2 bloqueia o cadastro (sem termos não há
 * aceite válido).
 */
export function useTerms() {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoints.termsCurrent()}`);

      if (!response.ok) {
        setError('Não foi possível carregar os termos. Tente de novo.');
        setTerms(null);
        return;
      }

      const data = await response.json();
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
