import type { Ref } from 'react';
import type { ViewInstance } from 'react-native';

import type { UserPhoto } from '@/types/user';

export type ProfilePhotoGridProps = {
  /** `null` enquanto a primeira carga não chegou: skeleton, ou o erro se `loadFailed`. */
  photos: UserPhoto[] | null;
  loadFailed: boolean;
  onRetry: () => void;
  /** Total para o rótulo "Foto {n} de {total}"; abaixo do que já carregou, vale o carregado. */
  total: number;
  /** Texto do vazio. */
  empty: { title: string; text: string };
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadMoreButtonRef: Ref<ViewInstance>;
};
