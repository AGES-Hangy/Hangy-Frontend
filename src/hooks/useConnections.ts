import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import { ApiError, apiFetch } from '@/utils/http';

export interface ConnectionItem {
  user_id: string;
  name: string;
  photo_url: string | null;
  city: string;
  connected_at: string;
}

export interface PendingConnectionItem {
  connection_id: string;
  user: { id: string; name: string; photo_url: string | null };
  created_at: string;
}

interface ConnectionsPage {
  items: ConnectionItem[];
  next_cursor: string | null;
}

interface PendingPage {
  items: PendingConnectionItem[];
  next_cursor: string | null;
}

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.kind === 'network') return 'Sem conexão com a internet.';
    if (err.kind === 'timeout') return 'A requisição demorou demais. Tente novamente.';
    return 'Não foi possível carregar as conexões.';
  }
  return 'Ocorreu um erro inesperado.';
}

const DEBOUNCE_MS = 400;

export function useConnections() {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [pendingConnections, setPendingConnections] = useState<PendingConnectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');

  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearchRef = useRef('');

  const fetchConnections = useCallback(async (searchTerm: string, replace: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const cursor = replace ? null : cursorRef.current;

    if (replace) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const path = endpoints.connections({ cursor, search: searchTerm || undefined });
      const data = await apiFetch<ConnectionsPage>(path);

      cursorRef.current = data.next_cursor;
      setHasMore(data.next_cursor !== null);

      setConnections(prev => {
        if (replace) return data.items;
        const existing = new Set(prev.map(c => c.user_id));
        const fresh = data.items.filter(c => !existing.has(c.user_id));
        return [...prev, ...fresh];
      });
    } catch (err) {
      setError(mapError(err));
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      let cursor: string | null = null;
      let allItems: PendingConnectionItem[] = [];
      do {
        const path = endpoints.connectionsPending(cursor);
        const data = await apiFetch<PendingPage>(path);
        allItems = [...allItems, ...data.items];
        cursor = data.next_cursor;
      } while (cursor);
      setPendingConnections(allItems);
    } catch {
      // pendentes são secundários; falha silenciosa não bloqueia a tela principal
    }
  }, []);

  const reload = useCallback(async () => {
    cursorRef.current = null;
    await Promise.all([
      fetchConnections(debouncedSearchRef.current, true),
      fetchPending(),
    ]);
  }, [fetchConnections, fetchPending]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return Promise.resolve();
    return fetchConnections(debouncedSearchRef.current, false);
  }, [hasMore, fetchConnections]);

  const handleSetSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debouncedSearchRef.current = value;
      cursorRef.current = null;
      setConnections([]);
      fetchConnections(value, true);
    }, DEBOUNCE_MS);
  }, [fetchConnections]);

  useEffect(() => {
    reload();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPending = pendingConnections.filter(item =>
    !debouncedSearchRef.current ||
    item.user.name.toLowerCase().includes(debouncedSearchRef.current.toLowerCase())
  );

  return {
    connections,
    pendingConnections: filteredPending,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    search,
    setSearch: handleSetSearch,
    loadMore,
    reload,
  };
}
