import { useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, type ViewInstance } from 'react-native';

import { useToast } from '@/components/Toast';
import type { UserEventsTabState } from '@/hooks/useUserEvents';
import type { UserEventsTab } from '@/types/user';
import type { LoadError } from '@/utils/apiErrors';

type Options = {
  tabs: Record<UserEventsTab, UserEventsTabState | null> | null;
  loadMore: (tab: UserEventsTab) => Promise<void>;
  isOffline: boolean;
};

function loadedAnnouncement(count: number, isEnd: boolean) {
  const loaded = count === 1 ? '1 evento carregado.' : `${count} eventos carregados.`;
  return isEnd ? `${loaded} Fim da lista.` : loaded;
}

/**
 * "Ver mais" das abas de eventos do perfil (`useUserEvents`): anuncia quantos
 * eventos chegaram, devolve o foco ao botão na Web e avisa a falha uma vez.
 */
export function useProfileEventsLoadMore({ tabs, loadMore, isOffline }: Options) {
  const { addToast } = useToast();
  const loadMoreButtonRef = useRef<ViewInstance>(null);
  // "Ver mais" em andamento: a aba e quantos itens ela tinha, para anunciar
  // quantos chegaram e devolver o foco ao botão.
  const pendingLoadMore = useRef<{ tab: UserEventsTab; countBefore: number } | null>(null);
  const shownLoadMoreErrors = useRef(new Map<UserEventsTab, LoadError>());

  // Todas as abas, e não só a ativa: a falha de um "Ver mais" é avisada mesmo
  // se a pessoa trocou de aba enquanto ele carregava.
  useEffect(() => {
    if (!tabs) return;
    for (const tab of Object.keys(tabs) as UserEventsTab[]) {
      const loadMoreError = tabs[tab]?.loadMoreError;
      if (!loadMoreError || shownLoadMoreErrors.current.get(tab) === loadMoreError) continue;
      shownLoadMoreErrors.current.set(tab, loadMoreError);
      if (!isOffline) {
        addToast({ type: 'error', message: 'Não foi possível carregar mais eventos. Toque em Ver mais para tentar de novo.' });
      }
    }
  }, [addToast, isOffline, tabs]);

  useEffect(() => {
    const pending = pendingLoadMore.current;
    const tabState = pending && tabs ? tabs[pending.tab] : null;
    if (!pending || !tabState || tabState.loadingMore) return;
    pendingLoadMore.current = null;

    const added = tabState.items.length - pending.countBefore;
    if (added > 0) AccessibilityInfo.announceForAccessibility(loadedAnnouncement(added, !tabState.hasMore));
    // Durante a carga o botão fica desabilitado, e na Web isso tira o foco dele.
    if (
      tabState.hasMore &&
      Platform.OS === 'web' &&
      typeof document !== 'undefined' &&
      document.activeElement === document.body
    ) {
      loadMoreButtonRef.current?.focus();
    }
  }, [tabs]);

  const handleLoadMore = useCallback((tab: UserEventsTab) => {
    const tabState = tabs?.[tab];
    if (!tabState || tabState.loadingMore) return;
    pendingLoadMore.current = { tab, countBefore: tabState.items.length };
    void loadMore(tab);
  }, [loadMore, tabs]);

  return { loadMoreButtonRef, handleLoadMore };
}
