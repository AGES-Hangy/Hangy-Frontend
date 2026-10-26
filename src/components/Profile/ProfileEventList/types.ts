import type { Ref } from 'react';
import type { ViewInstance } from 'react-native';

import type { EventState } from '@/components/EventCard/types';
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
  loadMoreButtonRef: Ref<ViewInstance>;
  /** Selo dos cards da aba (ex.: `Confirmed` em Confirmados). Padrão: sem selo. */
  cardState?: EventState;
};
