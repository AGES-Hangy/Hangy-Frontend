import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { AdminUser, AdminUsersResponse } from '@/types/admin';
import { adminUsersQuery } from '@/utils/adminUsers';
import type {
  AdminUsersPageSummary,
  AdminUsersQueryInput,
  AdminUsersStatusFilter,
} from '@/utils/adminUsers';
import { describeListLoadError, endsSession, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/** Espera depois da última tecla antes de buscar. */
const SEARCH_DEBOUNCE_MS = 300;

type UseAdminUsersParams = {
  search: string;
  filter: AdminUsersStatusFilter;
  /** Só no sucesso de uma troca de busca ou aba: não na carga inicial, no refresh nem no `loadMore`. */
  onQuerySettled?: (summary: AdminUsersPageSummary) => void;
};

/**
 * Lista de moderação de contas (`GET /admin/users`), paginada por cursor.
 *
 * - Trocar a aba limpa a lista. Trocar a busca mantém a lista até a resposta.
 * - `error` só existe sem lista para mostrar. Com lista, a falha vira toast.
 */
export function useAdminUsers({ search, filter, onQuerySettled }: UseAdminUsersParams) {
  const { addToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Cópia síncrona: decide entre erro na tela e toast antes do próximo render.
  const usersRef = useRef<AdminUser[]>([]);
  const cursorRef = useRef<string | null>(null);
  /** O último pedido; é o que o refresh e os retries repetem. */
  const requested = useRef<AdminUsersQueryInput>({ search, filter });
  /** De onde veio a lista na tela: com a busca falhando, o `loadMore` continua dela. */
  const listInput = useRef<AdminUsersQueryInput>({ search, filter });
  // Só a primeira página e a troca de busca, aba ou montagem avançam o id:
  // qualquer resposta em voo de antes disso, inclusive de `loadMore`, é descartada.
  const latestRequest = useRef(0);
  const inFlight = useRef(false);
  // Depois de uma falha, o fim da lista para de pedir a página sozinho
  // (o `onEndReached` dispara a cada rolagem): só o "Tentar de novo" volta.
  const loadMorePaused = useRef(false);
  /** Ligado na troca de busca ou aba, consumido no sucesso da primeira página dela. */
  const announcePending = useRef(false);
  const onQuerySettledRef = useRef(onQuerySettled);

  const applyPage = useCallback((items: AdminUser[], cursor: string | null) => {
    usersRef.current = items;
    cursorRef.current = cursor;
    setUsers(items);
    setHasMore(cursor !== null);
  }, []);

  const fetchFirstPage = useCallback(async (input: AdminUsersQueryInput) => {
    const requestId = ++latestRequest.current;
    let sessionEnded = false;
    inFlight.current = true;
    loadMorePaused.current = false;
    setIsLoadingMore(false);
    setError(null);
    if (usersRef.current.length === 0) setIsLoading(true);

    try {
      const page = await apiFetch<AdminUsersResponse>(endpoints.adminUsers(adminUsersQuery(input)));
      if (requestId !== latestRequest.current) return;

      listInput.current = input;
      applyPage(page.items, page.next_cursor);
      if (announcePending.current) {
        announcePending.current = false;
        onQuerySettledRef.current?.({ count: page.items.length, hasMore: page.next_cursor !== null });
      }
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      if (endsSession(caught)) {
        sessionEnded = true;
        return;
      }

      const loadError = describeListLoadError(caught);
      if (usersRef.current.length === 0) {
        setError(loadError);
        return;
      }
      addToast({
        type: 'error',
        message: loadError.message,
        actionLabel: 'Tentar de novo',
        onAction: () => { void fetchFirstPage(requested.current); },
      });
    } finally {
      if (requestId === latestRequest.current) {
        inFlight.current = false;
        // Com a sessão encerrada, o skeleton fica até a troca de tela.
        if (!sessionEnded) setIsLoading(false);
      }
    }
  }, [addToast, applyPage]);

  const fetchNextPage = useCallback(async () => {
    if (!cursorRef.current || inFlight.current) return;
    const requestId = latestRequest.current;
    inFlight.current = true;
    loadMorePaused.current = false;
    setIsLoadingMore(true);

    try {
      const page = await apiFetch<AdminUsersResponse>(
        endpoints.adminUsers(adminUsersQuery({ ...listInput.current, cursor: cursorRef.current })),
      );
      if (requestId !== latestRequest.current) return;

      const seen = new Set(usersRef.current.map(user => user.user_id));
      applyPage(
        [...usersRef.current, ...page.items.filter(user => !seen.has(user.user_id))],
        page.next_cursor,
      );
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      if (endsSession(caught)) return;

      if (isApiErrorLike(caught) && caught.status === 400) {
        // Cursor recusado pela API: insistir nele não adianta, a lista recomeça do zero.
        void fetchFirstPage(requested.current);
        return;
      }

      loadMorePaused.current = true;
      addToast({
        type: 'error',
        message: describeListLoadError(caught).message,
        actionLabel: 'Tentar de novo',
        onAction: () => { void fetchNextPage(); },
      });
    } finally {
      if (requestId === latestRequest.current) {
        inFlight.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [addToast, applyPage, fetchFirstPage]);

  const refetch = useCallback(() => fetchFirstPage(requested.current), [fetchFirstPage]);

  const loadMore = useCallback(() => {
    if (loadMorePaused.current) return;
    void fetchNextPage();
  }, [fetchNextPage]);

  const fetchFirstPageRef = useRef(fetchFirstPage);

  useEffect(() => {
    onQuerySettledRef.current = onQuerySettled;
    fetchFirstPageRef.current = fetchFirstPage;
  });

  const query = adminUsersQuery({ search, filter });

  // Um efeito e um timer só para busca e aba: a troca de aba cancela a busca
  // pendente e pede uma vez, já com o texto mais recente. Depende só de `query`
  // para nenhuma troca de identidade de função refazer a requisição.
  useEffect(() => {
    const queryChanged = adminUsersQuery(requested.current) !== query;
    const filterChanged = requested.current.filter !== filter;
    requested.current = { search, filter };
    // O fim da lista não pede página de uma lista que vai ser trocada.
    inFlight.current = true;
    if (queryChanged) announcePending.current = true;

    if (filterChanged) {
      applyPage([], null);
      setIsLoading(true);
    }

    // Aba e campo apagado respondem na hora; só digitar espera.
    const delay = queryChanged && !filterChanged && search.trim() ? SEARCH_DEBOUNCE_MS : 0;
    const timer = setTimeout(() => { void fetchFirstPageRef.current({ search, filter }); }, delay);

    return () => {
      clearTimeout(timer);
      ++latestRequest.current;
    };
  }, [query]);

  return { users, isLoading, isLoadingMore, error, refetch, loadMore, hasMore };
}
