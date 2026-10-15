import type { Ref } from 'react';
import type { View } from 'react-native';

import type { UserEventItem } from '@/types/user';

export type ProfileEventListProps = {
  /** `null` enquanto a primeira carga não chegou: skeleton, ou o erro se `loadFailed`. */
  items: UserEventItem[] | null;
  loadFailed: boolean;
  onRetry: () => void;
  /** Texto do vazio da aba ativa. */
  empty: { title: string; text: string };
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadMoreButtonRef: Ref<View>;
};
