import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { BlockedUser, BlockedUsersPage } from '@/types/profile';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;

/**
 * Falha do `GET` sem lista para mostrar. O 404 aqui não tem o sentido de
 * "evento indisponível" do `describeLoadError`: a rota é da própria conta, então
 * qualquer status que não seja rede ou timeout vira o erro genérico com retry.
 */
function describeBlockedLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout' || loadError.kind === 'server') {
    return loadError;
  }
  return describeLoadError(null);
}

/**
 * Lista paginada de quem a conta bloqueou (`GET /users/me/blocked`).
 *
 * `error` só existe quando a primeira página falhou — é o que troca a lista
 * pela tela de erro. Uma falha ao carregar mais vira toast e mantém o que já
 * apareceu.
 */
export function useBlockedUsers() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  // Cada `refresh` invalida as respostas que ainda estavam em voo.
  const generation = useRef(0);
  const mounted = useRef(true);
  // Depois de uma falha ao carregar mais, o fim da lista para de pedir a página
  // sozinho (o `onEndReached` dispara a cada rolagem): só o "Tentar de novo" volta.
  const loadMorePaused = useRef(false);

  const fetchPage = useCallback(async (replace: boolean) => {
    if (!replace && inFlight.current) return;
    inFlight.current = true;
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
      const page = await apiFetch<BlockedUsersPage>(endpoints.blockedUsers({ limit: PAGE_LIMIT, cursor }));
      if (!mounted.current || current !== generation.current) return;

      cursorRef.current = page.next_cursor;
      setHasMore(page.next_cursor !== null);
      setUsers(previous => {
        if (replace) return page.items;
        const seen = new Set(previous.map(user => user.user_id));
        return [...previous, ...page.items.filter(user => !seen.has(user.user_id))];
      });
    } catch (caught) {
      if (!mounted.current || current !== generation.current) return;
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return;

      if (isApiErrorLike(caught) && caught.status === 400) {
        // Erro de programação do app (limit/cursor inválido): insistir não adianta.
        console.warn('[api] paginação inválida em /users/me/blocked:', caught.detail);
        setHasMore(false);
        if (replace) setError(describeBlockedLoadError(caught));
        else addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
        return;
      }

      const loadError = describeBlockedLoadError(caught);
      if (replace) {
        setError(loadError);
      } else {
        loadMorePaused.current = true;
        addToast({
          type: 'error',
          message: loadError.message,
          actionLabel: 'Tentar de novo',
          onAction: () => { void fetchPage(false); },
        });
      }
    } finally {
      if (current === generation.current) {
        inFlight.current = false;
        if (mounted.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
  }, [addToast]);

  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || inFlight.current || loadMorePaused.current) return Promise.resolve();
    return fetchPage(false);
  }, [hasMore, fetchPage]);

  /** Tira o item da lista na hora (atualização otimista). */
  const removeUser = useCallback((userId: string) => {
    setUsers(previous => previous.filter(user => user.user_id !== userId));
  }, []);

  /** Desfaz o `removeUser` quando o `DELETE` falha, na mesma posição. */
  const restoreUser = useCallback((user: BlockedUser, index: number) => {
    setUsers(previous => {
      if (previous.some(item => item.user_id === user.user_id)) return previous;
      const position = Math.min(index, previous.length);
      return [...previous.slice(0, position), user, ...previous.slice(position)];
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void fetchPage(true);
    return () => {
      mounted.current = false;
    };
  }, [fetchPage]);

  return { users, isLoading, isLoadingMore, error, hasMore, loadMore, refresh, removeUser, restoreUser };
}
