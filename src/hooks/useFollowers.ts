import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { Follower, FollowersResponse } from '@/types/profile';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;
/** Espera depois da última tecla antes de buscar. */
const SEARCH_DEBOUNCE_MS = 300;
/** O backend responde `422` para `q` com 1 caractere: abaixo disto o app nem chama. */
const MIN_SEARCH_LENGTH = 2;

type FetchMode = 'initial' | 'search' | 'more';

/** O `q` que vai para a API: curto demais conta como campo vazio (lista completa). */
function searchQueryOf(text: string) {
  const trimmed = text.trim();
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '';
}

/**
 * Falha do `GET` sem lista para mostrar. A rota é da própria conta, então
 * qualquer status que não seja rede ou timeout vira o erro genérico com retry.
 */
function describeFollowersLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout' || loadError.kind === 'server') {
    return loadError;
  }
  return describeLoadError(null);
}

/**
 * Seguidores do estabelecimento logado (`GET /businesses/me/followers`),
 * paginados por cursor e com busca por nome.
 *
 * - `error` só existe quando não há lista para mostrar — é o que troca a lista
 *   pela tela de erro. Falha ao buscar ou ao carregar mais vira toast e mantém
 *   o que já apareceu.
 * - Enquanto uma busca está em voo, a lista anterior continua na tela
 *   (`isSearching`); `activeQuery` é o `q` da lista que está aparecendo.
 * - `total` é o geral, sem filtro: só a resposta sem `q` atualiza.
 * - `forbidden` liga com o `403` (conta que não é estabelecimento); o toast já
 *   foi mostrado e a tela só precisa sair.
 */
export function useFollowers() {
  const { addToast } = useToast();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  /** `q` do último pedido que troca a lista; o "carregar mais" continua dele. */
  const requestedQuery = useRef('');
  const inFlight = useRef(false);
  // Cada pedido que troca a lista invalida os que ainda estavam em voo: uma
  // resposta de um `q` antigo que chega depois é descartada.
  const generation = useRef(0);
  const mounted = useRef(true);
  // Depois de uma falha ao carregar mais, o fim da lista para de pedir a página
  // sozinho (o `onEndReached` dispara a cada rolagem): só o "Tentar de novo" volta.
  const loadMorePaused = useRef(false);

  const fetchPage = useCallback(async (q: string, mode: FetchMode) => {
    if (mode === 'more' && inFlight.current) return;
    inFlight.current = true;
    const replace = mode !== 'more';
    const current = replace ? ++generation.current : generation.current;
    const cursor = replace ? null : cursorRef.current;

    loadMorePaused.current = false;
    const previousQuery = requestedQuery.current;
    if (replace) requestedQuery.current = q;
    if (mode === 'initial') {
      setIsLoading(true);
      setError(null);
    } else if (mode === 'search') {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const page = await apiFetch<FollowersResponse>(
        endpoints.businessFollowers({ q: q || undefined, limit: PAGE_LIMIT, cursor }),
      );
      if (!mounted.current || current !== generation.current) return;

      cursorRef.current = page.next_cursor;
      setHasMore(page.next_cursor !== null);
      if (!q) setTotal(page.total);
      setActiveQuery(q);
      setError(null);
      setFollowers(previous => {
        if (replace) return page.items;
        const seen = new Set(previous.map(follower => follower.user_id));
        return [...previous, ...page.items.filter(follower => !seen.has(follower.user_id))];
      });
    } catch (caught) {
      if (!mounted.current || current !== generation.current) return;
      // A busca falhou e a lista anterior continua na tela: o cursor e o
      // "carregar mais" seguem sendo dela.
      if (mode === 'search') requestedQuery.current = previousQuery;
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return;

      if (isApiErrorLike(caught) && caught.status === 403) {
        // Só o estabelecimento chega aqui; se não for, a tela não tem o que mostrar.
        addToast({ type: 'error', message: 'Não foi possível abrir esta tela' });
        setForbidden(true);
        return;
      }

      if (isApiErrorLike(caught) && caught.status === 400) {
        // Erro de programação do app (limit/cursor inválido): insistir não adianta.
        console.warn('[api] paginação inválida em /businesses/me/followers:', caught.detail);
        setHasMore(false);
        if (mode === 'initial') setError(describeFollowersLoadError(caught));
        else addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
        return;
      }

      const loadError = describeFollowersLoadError(caught);
      if (mode === 'initial') {
        setError(loadError);
        return;
      }
      if (mode === 'more') loadMorePaused.current = true;
      addToast({
        type: 'error',
        message: loadError.message,
        actionLabel: 'Tentar de novo',
        onAction: () => { void fetchPage(q, mode); },
      });
    } finally {
      if (current === generation.current) {
        inFlight.current = false;
        if (mounted.current) {
          setIsLoading(false);
          setIsSearching(false);
          setIsLoadingMore(false);
        }
      }
    }
  }, [addToast]);

  /** Recarrega do zero o `q` atual — o "Tentar de novo" da tela de erro. */
  const refresh = useCallback(() => fetchPage(requestedQuery.current, 'initial'), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || inFlight.current || loadMorePaused.current) return Promise.resolve();
    return fetchPage(requestedQuery.current, 'more');
  }, [hasMore, fetchPage]);

  useEffect(() => {
    mounted.current = true;
    void fetchPage('', 'initial');
    return () => {
      mounted.current = false;
    };
  }, [fetchPage]);

  // Trocar o `q` zera o cursor e a lista. Apagar o campo volta na hora para a
  // lista completa; digitar espera o debounce.
  useEffect(() => {
    const q = searchQueryOf(query);
    if (q === requestedQuery.current) return;
    const timer = setTimeout(() => { void fetchPage(q, 'search'); }, q ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query, fetchPage]);

  return {
    followers,
    total,
    query,
    activeQuery,
    isLoading,
    isSearching,
    isLoadingMore,
    error,
    forbidden,
    hasMore,
    loadMore,
    refresh,
    search: setQuery,
  };
}
