import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, type ViewInstance } from 'react-native';

import { useToast } from '@/components/Toast';
import type { UserPhoto } from '@/types/user';
import type { LoadError } from '@/utils/apiErrors';

type Options = {
  photos: UserPhoto[] | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: LoadError | null;
  loadMore: () => Promise<void>;
  isOffline: boolean;
};

function loadedAnnouncement(count: number, isEnd: boolean) {
  const loaded = count === 1 ? '1 foto carregada.' : `${count} fotos carregadas.`;
  return isEnd ? `${loaded} Fim das fotos.` : loaded;
}

/**
 * "Ver mais" da Galeria do perfil (`useMyPhotos`), com a regra do
 * `useProfileEventsLoadMore`: anuncia quantas fotos chegaram, devolve o foco ao
 * botão na Web e avisa a falha uma vez.
 */
export function useProfilePhotosLoadMore({
  photos,
  hasMore,
  isLoadingMore,
  loadMoreError,
  loadMore,
  isOffline,
}: Options) {
  const { addToast } = useToast();
  const loadMoreButtonRef = useRef<ViewInstance>(null);
  // Quantas fotos havia quando o "Ver mais" começou, para anunciar quantas chegaram.
  const countBefore = useRef<number | null>(null);
  const shownLoadMoreError = useRef<LoadError | null>(null);

  // Fica na tela, e não na grade: a falha é avisada mesmo se a pessoa saiu da
  // Galeria enquanto o "Ver mais" carregava.
  useEffect(() => {
    if (!loadMoreError || shownLoadMoreError.current === loadMoreError) return;
    shownLoadMoreError.current = loadMoreError;
    if (!isOffline) {
      addToast({ type: 'error', message: 'Não foi possível carregar mais fotos. Toque em Ver mais para tentar de novo.' });
    }
  }, [addToast, isOffline, loadMoreError]);

  useEffect(() => {
    const before = countBefore.current;
    if (before === null || isLoadingMore || !photos) return;
    countBefore.current = null;

    const added = photos.length - before;
    if (added > 0) AccessibilityInfo.announceForAccessibility(loadedAnnouncement(added, !hasMore));
    // Durante a carga o botão fica desabilitado, e na Web isso tira o foco dele.
    if (hasMore && Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement === document.body) {
      loadMoreButtonRef.current?.focus();
    }
  }, [hasMore, isLoadingMore, photos]);

  const handleLoadMore = useCallback(() => {
    if (!photos || isLoadingMore) return;
    countBefore.current = photos.length;
    void loadMore();
  }, [isLoadingMore, loadMore, photos]);

  return { loadMoreButtonRef, handleLoadMore };
}
