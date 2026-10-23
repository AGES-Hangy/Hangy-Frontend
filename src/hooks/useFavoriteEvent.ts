import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import {
  confirmFavorite,
  createFavoriteState,
  favoriteErrorOutcome,
  inactiveFavoriteMessage,
  isCurrentRequest,
  retryFavorite,
  revertFavorite,
  setFavorite,
  syncFavorite,
} from '@/utils/favoriteEvent';
import type { FavoriteRequest, FavoriteStart, FavoriteState } from '@/utils/favoriteEvent';
import { apiFetch } from '@/utils/http';

export interface UseFavoriteEventOptions {
  /** Só é chamado com a tela ativa (montada e focada). */
  onUnavailable?: () => void;
  /** Citado no toast quando a resposta chega com a tela inativa. */
  eventTitle?: string;
}

export function useFavoriteEvent(
  eventId: string | undefined,
  initialIsFavorited: boolean,
  options?: UseFavoriteEventOptions,
) {
  const { addToast } = useToast();
  const navigation = useNavigation();
  // O toque duplo no mesmo frame precisa ver o `inFlight` antes do re-render.
  const stateRef = useRef<FavoriteState>(createFavoriteState(eventId, initialIsFavorited));
  const [state, setState] = useState(stateRef.current);
  const isMountedRef = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // O `onAction` do toast vive mais que o render que o criou.
  const retryRef = useRef<((failed: FavoriteRequest) => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const commit = useCallback((next: FavoriteState) => {
    stateRef.current = next;
    if (isMountedRef.current) setState(next);
  }, []);

  // Trocar de aba não desmonta a tela: navegar ou oferecer ação fora de foco
  // agiria sobre uma tela que a pessoa não está vendo.
  const isActive = useCallback(() => isMountedRef.current && navigation.isFocused(), [navigation]);

  useEffect(() => {
    commit(syncFavorite(stateRef.current, eventId, initialIsFavorited));
  }, [commit, eventId, initialIsFavorited]);

  const send = useCallback(async ({ state: next, request }: FavoriteStart) => {
    commit(next);
    if (!request) return;

    try {
      await apiFetch<void>(endpoints.eventFavorite(request.eventId), { method: request.target ? 'POST' : 'DELETE' });
      if (isCurrentRequest(stateRef.current, request)) commit(confirmFavorite(stateRef.current, request));
    } catch (caught) {
      if (!isCurrentRequest(stateRef.current, request)) return;
      commit(revertFavorite(stateRef.current, request));

      const error = isApiErrorLike(caught) ? caught : null;
      if (!isActive()) {
        const message = inactiveFavoriteMessage(error, request.target, optionsRef.current?.eventTitle);
        if (message) addToast({ type: 'error', message });
        return;
      }

      const outcome = favoriteErrorOutcome(error, request.target);
      if (outcome.kind === 'ignore') return;
      if (outcome.kind === 'retry') {
        addToast({
          type: 'error',
          message: outcome.message,
          actionLabel: 'Tentar de novo',
          onAction: () => retryRef.current?.(request),
        });
        return;
      }

      addToast({ type: 'error', message: outcome.message });
      if (outcome.kind === 'unavailable') optionsRef.current?.onUnavailable?.();
    }
  }, [addToast, commit, isActive]);

  const retry = useCallback((failed: FavoriteRequest) => {
    if (!isActive()) return;
    void send(retryFavorite(stateRef.current, failed));
  }, [isActive, send]);
  retryRef.current = retry;

  const toggle = useCallback(() => {
    void send(setFavorite(stateRef.current, !stateRef.current.isFavorited));
  }, [send]);

  return { isFavorited: state.isFavorited, toggle, isLoading: state.inFlight !== null };
}
