import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { BusinessSearchItem, BusinessSearchResponse } from '@/types/search';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;
/** O backend responde `400 Query is too short` abaixo disto e não lista sem termo. */
const MIN_QUERY_LENGTH = 2;
/** Acima disto o FastAPI recusa o `q` com `422`: o app corta antes de enviar. */
const MAX_QUERY_LENGTH = 120;

/**
 * Falha do `GET` sem lista para mostrar. Só rede, timeout e servidor têm
 * tratamento próprio; o resto (inclusive o `400` de paginação) vira o erro
 * genérico com retry.
 */
function describeBusinessesLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout' || loadError.kind === 'server') {
    return loadError;
  }
  return describeLoadError(null);
}

/**
 * Estabelecimentos da busca (`GET /search/businesses`), paginados por cursor.
 *
 * - `error` só existe quando não há lista para mostrar — é o que troca a lista
 *   pela tela de erro. Falha ao carregar mais vira toast com "Tentar de novo"
 *   e mantém o que já apareceu.
 * - `loadMore` tem trava contra requisição duplicada numa `ref` (não em estado):
 *   o scroll rápido dispara `onEndReached` várias vezes no mesmo tick, e o
 *   estado só atualizaria no render seguinte.
 * - Depois de uma falha ao carregar mais, o fim da lista para de pedir a página
 *   sozinho: só o "Tentar de novo" volta.
 * - `q` mudou: a resposta de um `q` antigo que chega depois é descartada.
 * - Sem termo válido (menos de 2 caracteres) o backend não lista nada — responde
 *   `400 Query is too short` —, então o hook nem chama a API e devolve lista vazia.
 */
export function useSearchBusinesses(q?: string) {
  const term = (q ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  const canSearch = term.length >= MIN_QUERY_LENGTH;
  const { addToast } = useToast();
  const [businesses, setBusinesses] = useState<BusinessSearchItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(canSearch);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const loadMorePaused = useRef(false);

  const fetchPage = useCallback(
    async (mode: 'initial' | 'more') => {
      if (mode === 'more' && inFlight.current) return;
      inFlight.current = true;
      const replace = mode === 'initial';
      const current = replace ? ++generation.current : generation.current;
      const cursor = replace ? null : cursorRef.current;

      loadMorePaused.current = false;
      if (replace) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const page = await apiFetch<BusinessSearchResponse>(
          endpoints.searchBusinesses({ q: term, limit: PAGE_LIMIT, cursor }),
        );
        if (!mounted.current || current !== generation.current) return;

        cursorRef.current = page.next_cursor;
        setHasMore(page.next_cursor !== null);
        setTotal(page.total);
        setError(null);
        setBusinesses((previous) => {
          if (replace) return page.items;
          // Defesa contra item repetido entre páginas (vira `key` duplicada).
          const seen = new Set(previous.map((business) => business.user_id));
          return [...previous, ...page.items.filter((business) => !seen.has(business.user_id))];
        });
      } catch (caught) {
        if (!mounted.current || current !== generation.current) return;
        // O `apiFetch` já avisa a sessão expirada e volta para o Login.
        if (isApiErrorLike(caught) && caught.status === 401) return;

        if (isApiErrorLike(caught) && caught.status === 400) {
          // Erro de programação do app (cursor/limit inválido ou termo curto): insistir não adianta.
          console.warn('[api] requisição inválida em /search/businesses:', caught.detail);
          setHasMore(false);
          if (replace) setError(describeBusinessesLoadError(caught));
          else addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
          return;
        }

        const loadError = describeBusinessesLoadError(caught);
        if (replace) {
          setBusinesses([]);
          setTotal(null);
          setHasMore(false);
          setError(loadError);
          return;
        }
        loadMorePaused.current = true;
        addToast({
          type: 'error',
          message: loadError.message,
          actionLabel: 'Tentar de novo',
          onAction: () => {
            void fetchPage('more');
          },
        });
      } finally {
        if (current === generation.current) {
          inFlight.current = false;
          if (mounted.current) {
            setIsLoading(false);
            setIsLoadingMore(false);
          }
        }
      }
    },
    [term, addToast],
  );

  const refresh = useCallback(
    () => (canSearch ? fetchPage('initial') : Promise.resolve()),
    [canSearch, fetchPage],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || inFlight.current || loadMorePaused.current) return Promise.resolve();
    return fetchPage('more');
  }, [hasMore, fetchPage]);

  useEffect(() => {
    mounted.current = true;
    if (canSearch) {
      void fetchPage('initial');
    } else {
      // Invalida qualquer pedido em voo de um termo anterior e zera a lista.
      generation.current += 1;
      inFlight.current = false;
      cursorRef.current = null;
      setBusinesses([]);
      setTotal(null);
      setHasMore(false);
      setError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
    return () => {
      mounted.current = false;
    };
  }, [canSearch, fetchPage]);

  return { businesses, total, isLoading, isLoadingMore, error, hasMore, loadMore, refresh };
}