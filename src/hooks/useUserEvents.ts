import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { UserEventItem, UserEventsPage, UserEventsTab, UserEventsTabs } from '@/types/user';
import { apiFetch } from '@/utils/http';
import { describeProfileLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

export type UserEventsTabState = {
  items: UserEventItem[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: LoadError | null;
};

type StoredTab = {
  items: UserEventItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  loadMoreError: LoadError | null;
};

type StoredTabs = { id: string; tabs: Record<UserEventsTab, StoredTab | null> };

const TABS: UserEventsTab[] = ['history', 'created', 'interests', 'confirmed'];

function toStoredTab(page: UserEventsPage | null): StoredTab | null {
  return page ? { items: page.items, nextCursor: page.next_cursor, loadingMore: false, loadMoreError: null } : null;
}

function toTabState(tab: StoredTab | null): UserEventsTabState | null {
  if (!tab) return null;
  return {
    items: tab.items,
    hasMore: tab.nextCursor !== null,
    loadingMore: tab.loadingMore,
    loadMoreError: tab.loadMoreError,
  };
}

type Options = {
  /** Recarrega a cada volta ao foco; o primeiro foco não conta, a carga inicial já sai da montagem. */
  reloadOnFocus?: boolean;
};

export function useUserEvents(userId: string | undefined, { reloadOnFocus = false }: Options = {}) {
  const [loaded, setLoaded] = useState<StoredTabs | null>(null);
  // Cópia síncrona de `loaded`: o "Ver mais" precisa do cursor atual da aba
  // antes de o React renderizar de novo.
  const loadedRef = useRef<StoredTabs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  // Um `reload` invalida também os "Ver mais" em voo: a página deles não pode
  // ser anexada a uma lista que recomeçou.
  const latestRequest = useRef(0);
  const loadingMoreTabs = useRef(new Set<UserEventsTab>());

  const store = useCallback((next: StoredTabs | null) => {
    loadedRef.current = next;
    setLoaded(next);
  }, []);

  const updateTab = useCallback((id: string, tab: UserEventsTab, change: (current: StoredTab) => StoredTab) => {
    const current = loadedRef.current;
    const tabState = current?.tabs[tab];
    if (!current || current.id !== id || !tabState) return;
    store({ id, tabs: { ...current.tabs, [tab]: change(tabState) } });
  }, [store]);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    loadingMoreTabs.current.clear();
    // O "Ver mais" em voo foi invalidado e não limpa a própria aba: sem isto,
    // uma recarga que falhasse deixaria o botão carregando para sempre.
    const current = loadedRef.current;
    if (current && TABS.some((tab) => current.tabs[tab]?.loadingMore)) {
      store({
        id: current.id,
        tabs: Object.fromEntries(
          TABS.map((tab) => {
            const tabState = current.tabs[tab];
            return [tab, tabState ? { ...tabState, loadingMore: false } : null];
          }),
        ) as StoredTabs['tabs'],
      });
    }

    if (!userId) {
      setLoadedId(userId);
      setIsLoading(false);
      setError(describeProfileLoadError({ kind: 'http', status: 404, detail: 'User not found' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<UserEventsTabs>(endpoints.userEvents(userId));
      if (requestId !== latestRequest.current) return;
      const tabs = Object.fromEntries(TABS.map((tab) => [tab, toStoredTab(result[tab])])) as StoredTabs['tabs'];
      store({ id: userId, tabs });
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeProfileLoadError(caught));
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedId(userId);
        setIsLoading(false);
      }
    }
  }, [store, userId]);

  const loadMore = useCallback(async (tab: UserEventsTab) => {
    const current = loadedRef.current;
    const tabState = current?.tabs[tab];
    if (!current || current.id !== userId || !tabState?.nextCursor || loadingMoreTabs.current.has(tab)) return;

    const generation = latestRequest.current;
    const { id } = current;
    const cursor = tabState.nextCursor;
    loadingMoreTabs.current.add(tab);
    updateTab(id, tab, (state) => ({ ...state, loadingMore: true, loadMoreError: null }));

    try {
      const result = await apiFetch<UserEventsTabs>(endpoints.userEvents(id, { tab, cursor }));
      if (generation !== latestRequest.current) return;
      const page = result[tab];
      updateTab(id, tab, (state) => ({
        ...state,
        items: [...state.items, ...(page?.items ?? [])],
        nextCursor: page?.next_cursor ?? null,
      }));
    } catch (caught) {
      if (generation !== latestRequest.current) return;
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return;
      updateTab(id, tab, (state) => ({ ...state, loadMoreError: describeProfileLoadError(caught) }));
    } finally {
      // Um pedido descartado não mexe na aba: pode já haver um "Ver mais" da
      // geração nova em voo nela.
      if (generation === latestRequest.current) {
        loadingMoreTabs.current.delete(tab);
        updateTab(id, tab, (state) => ({ ...state, loadingMore: false }));
      }
    }
  }, [updateTab, userId]);

  // Por padrão, sem recarregar no foco: as páginas já anexadas seriam
  // descartadas. A lista recarrega quando o id muda e no "Tentar de novo".
  useEffect(() => {
    void load();
  }, [load]);

  // O callback do foco não pode depender do `load`, que muda com o id: a
  // troca de id dispararia o foco de novo, além da carga da montagem.
  const latestLoad = useRef(load);
  const latestUserId = useRef(userId);
  useEffect(() => {
    latestLoad.current = load;
    latestUserId.current = userId;
  }, [load, userId]);
  const hasFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!reloadOnFocus) return;
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }
      if (latestUserId.current) void latestLoad.current();
    }, [reloadOnFocus]),
  );

  const isStale = loadedId !== userId;
  const visible = loaded && loaded.id === userId ? loaded.tabs : null;

  return {
    tabs: visible
      ? (Object.fromEntries(TABS.map((tab) => [tab, toTabState(visible[tab])])) as Record<
          UserEventsTab,
          UserEventsTabState | null
        >)
      : null,
    isLoading: isLoading || isStale,
    error: isStale ? null : error,
    reload: load,
    loadMore,
  };
}
