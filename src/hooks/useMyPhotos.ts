import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { UserPhoto, UserPhotosPage } from '@/types/user';
import { describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export function useMyPhotos({ enabled }: { enabled: boolean }) {
  const [photos, setPhotos] = useState<UserPhoto[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<LoadError | null>(null);
  // Um `reload` invalida também a página seguinte em voo: a resposta dela não
  // pode ser grudada numa lista que recomeçou.
  const latestRequest = useRef(0);
  const loadingMore = useRef(false);
  const hasRequested = useRef(false);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);
    setLoadMoreError(null);

    try {
      const page = await apiFetch<UserPhotosPage>(endpoints.myPhotos());
      if (requestId !== latestRequest.current) return;
      setPhotos(page.items);
      setNextCursor(page.next_cursor);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeLoadError(caught));
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore.current || isLoading) return;
    const requestId = latestRequest.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const page = await apiFetch<UserPhotosPage>(endpoints.myPhotos({ cursor: nextCursor }));
      if (requestId !== latestRequest.current) return;
      setPhotos((current) => [...(current ?? []), ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setLoadMoreError(describeLoadError(caught));
    } finally {
      loadingMore.current = false;
      setIsLoadingMore(false);
    }
  }, [isLoading, nextCursor]);

  useEffect(() => {
    if (!enabled || hasRequested.current) return;
    hasRequested.current = true;
    void reload();
  }, [enabled, reload]);

  return {
    photos,
    isLoading,
    error,
    hasMore: nextCursor !== null,
    isLoadingMore,
    loadMoreError,
    loadMore,
    reload,
  };
}
