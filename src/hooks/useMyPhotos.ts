import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { UserPhoto, UserPhotosPage } from '@/types/user';
import { describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { ApiError, apiFetch } from '@/utils/http';

/**
 * Galeria do perfil. Sem `userId`, as fotos de quem está logado
 * (`GET /users/me/photos`); com ele, as de outra pessoa
 * (`GET /users/{id}/photos`).
 */
export function useMyPhotos({ enabled, userId }: { enabled: boolean; userId?: string }) {
  const [photos, setPhotos] = useState<UserPhoto[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<LoadError | null>(null);
  // 403 da galeria de outra pessoa: quem visita deixou de ser conexão.
  const [isForbidden, setIsForbidden] = useState(false);
  // Um `reload` invalida também a página seguinte em voo: a resposta dela não
  // pode ser grudada numa lista que recomeçou.
  const latestRequest = useRef(0);
  const loadingMore = useRef(false);
  const hasRequested = useRef(false);
  // A tela de perfil continua montada ao abrir outro perfil: a galeria de antes
  // não pode aparecer no novo.
  const requestedUserId = useRef<string | undefined>(undefined);

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    setError(null);
    setLoadMoreError(null);
    setIsForbidden(false);

    try {
      const page = await apiFetch<UserPhotosPage>(userId ? endpoints.userPhotos(userId) : endpoints.myPhotos());
      if (requestId !== latestRequest.current) return;
      setPhotos(page.items);
      setNextCursor(page.next_cursor);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeLoadError(caught));
      setIsForbidden(caught instanceof ApiError && caught.status === 403);
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore.current || isLoading) return;
    const requestId = latestRequest.current;
    loadingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const options = { cursor: nextCursor };
      const page = await apiFetch<UserPhotosPage>(
        userId ? endpoints.userPhotos(userId, options) : endpoints.myPhotos(options),
      );
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
  }, [isLoading, nextCursor, userId]);

  useEffect(() => {
    if (!enabled) return;
    if (hasRequested.current && requestedUserId.current === userId) return;
    if (hasRequested.current) {
      setPhotos(null);
      setNextCursor(null);
    }
    hasRequested.current = true;
    requestedUserId.current = userId;
    void reload();
  }, [enabled, reload, userId]);

  /** Tira da lista uma foto já excluída no servidor, sem recarregar. */
  const removeLocal = useCallback((photoId: string) => {
    setPhotos((current) => current?.filter((photo) => photo.photo_id !== photoId) ?? null);
  }, []);

  /** Todas as fotos da mesma experiência dividem a descrição. */
  const updateLocalDescription = useCallback((experienceId: string, description: string) => {
    setPhotos((current) => current?.map((photo) => (
      photo.experience_id === experienceId ? { ...photo, description } : photo
    )) ?? null);
  }, []);

  return {
    photos,
    isLoading,
    error,
    isForbidden,
    hasMore: nextCursor !== null,
    isLoadingMore,
    loadMoreError,
    loadMore,
    reload,
    removeLocal,
    updateLocalDescription,
  };
}
