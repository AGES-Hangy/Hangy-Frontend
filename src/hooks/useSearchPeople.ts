import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { useConnectionActions, type ConnectResult } from '@/hooks/useConnectionActions';
import { MIN_SEARCH_QUERY_LENGTH } from '@/hooks/useSearch';
import type { SearchUsersPage } from '@/types/search';
import { describeLoadError, isApiErrorLike, type LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;
const MAX_QUERY_LENGTH = 120;

interface SearchState {
  term: string;
  page: SearchUsersPage | null;
  isLoading: boolean;
  error: LoadError | null;
}

export function useSearchPeople(query: string) {
  const term = Array.from(query.trim()).slice(0, MAX_QUERY_LENGTH).join('');
  const enabled = [...term].length >= MIN_SEARCH_QUERY_LENGTH;
  const { addToast } = useToast();
  const { connect } = useConnectionActions();
  const [state, setState] = useState<SearchState | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const connectionRequest = useRef<Promise<ConnectResult> | null>(null);
  const focus = useRef(0);
  const inFlight = useRef(false);
  const cursor = useRef<string | null>(null);
  const paginationPaused = useRef(false);
  const focused = useRef(false);
  const current = state?.term === term ? state : null;

  const fetchPage = useCallback(async (more: boolean, restart = false) => {
    if (!enabled || !focused.current || (inFlight.current && !restart) || (more && cursor.current === null)) return;
    if (restart) focus.current += 1;
    const revision = focus.current;
    inFlight.current = true;
    paginationPaused.current = false;
    const requestedCursor = more ? cursor.current : null;
    if (!more) cursor.current = null;

    setState(previous => ({
      term,
      page: more && previous?.term === term ? previous.page : null,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await apiFetch<SearchUsersPage>(
        endpoints.searchUsers({ q: term, limit: PAGE_LIMIT, cursor: requestedCursor }),
      );
      if (revision !== focus.current) return;
      cursor.current = response.next_cursor;
      setState(previous => {
        const loaded = more ? previous?.page?.items ?? [] : [];
        const seen = new Set(loaded.map(person => person.user_id));
        const items = [...loaded, ...response.items.filter(person => !seen.has(person.user_id))];
        return { term, page: { ...response, items }, isLoading: false, error: null };
      });
    } catch (caught) {
      if (revision !== focus.current) return;
      if (isApiErrorLike(caught) && caught.status === 401) return;

      let error = describeLoadError(caught);
      if (error.kind === 'unavailable' || error.kind === 'cancelled') error = describeLoadError(null);

      if (isApiErrorLike(caught) && caught.status === 400) {
        console.warn('[api] requisição inválida em /search/users:', caught.detail);
        cursor.current = null;
        error = { ...error, canRetry: false };
        addToast({ type: 'error', message: error.message });
      } else if (error.kind === 'timeout') {
        addToast({
          type: 'error',
          message: error.message,
          actionLabel: 'Tentar de novo',
          onAction: () => {
            if (revision === focus.current && paginationPaused.current && cursor.current === requestedCursor) {
              void fetchPage(more);
            }
          },
        });
      }

      paginationPaused.current = true;

      setState(previous => ({
        term,
        page: more && previous?.term === term ? previous.page : null,
        isLoading: false,
        error,
      }));
    } finally {
      if (revision === focus.current) inFlight.current = false;
    }
  }, [addToast, enabled, term]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    const revision = focus.current;
    const pending = connectionRequest.current;
    if (pending) {
      // Ao voltar durante um envio, a consulta precisa ler o vínculo após o POST.
      void pending.then(() => {
        if (revision === focus.current) void fetchPage(false);
      });
    } else {
      void fetchPage(false);
    }
    return () => {
      focused.current = false;
      focus.current += 1;
      inFlight.current = false;
      cursor.current = null;
    };
  }, [fetchPage]));

  const page = current?.page;
  const error = current?.error ?? null;
  const hasMore = Boolean(page?.next_cursor) && error?.canRetry !== false;

  async function connectPerson(userId: string) {
    if (!focused.current || connectionRequest.current) return;
    const person = page?.items.find(item => item.user_id === userId);
    if (person?.connection_status !== null) return;

    const revision = focus.current;
    const request = connect(userId);
    connectionRequest.current = request;
    setConnectingId(userId);

    try {
      const result = await request;
      if (revision !== focus.current) return;

      if (result.kind === 'sent') {
        setState(previous => {
          if (!previous?.page || previous.term !== term) return previous;
          const items = previous.page.items.map(item => (
            item.user_id === userId ? { ...item, connection_status: 'PENDING' as const } : item
          ));
          return { ...previous, page: { ...previous.page, items } };
        });
        addToast({ type: 'success', message: 'Solicitação de conexão enviada.' });
      } else if (result.kind === 'conflict' || result.kind === 'unavailable') {
        const message = result.kind === 'conflict'
          ? 'Já existe um vínculo com esta pessoa.'
          : 'Este perfil não está disponível.';
        addToast({ type: 'info', message });
        void fetchPage(false, true);
      }
    } finally {
      connectionRequest.current = null;
      setConnectingId(null);
    }
  }

  return {
    term,
    people: page?.items ?? [],
    total: page?.total ?? null,
    isLoading: enabled && !page && (current?.isLoading ?? true),
    isLoadingMore: !!page && !!current?.isLoading,
    error,
    hasMore,
    connectingId,
    connectPerson,
    loadMore: () => {
      if (hasMore && page?.next_cursor === cursor.current && !paginationPaused.current) void fetchPage(true);
    },
    retry: () => {
      if (error?.canRetry) void fetchPage(!!page);
    },
  };
}
