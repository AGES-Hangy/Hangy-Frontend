import { useCallback, useEffect, useRef, useState } from 'react';

import type { EventPrivacy } from '@/components/EventCard/types';
import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;

/** Item de `GET /search/events` (task 127 [BE]). */
export interface SearchEventItem {
  event_id: string;
  title: string;
  event_date: string;
  location_name: string | null;
  cover_photo_url: string | null;
  privacy: EventPrivacy;
}

interface SearchEventsResponse {
  items: SearchEventItem[];
  next_cursor: string | null;
  total: number;
}

/** O que a origem (Home ou Search) entrega e a tela mantém. */
export interface SearchEventsParams {
  q?: string;
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Falha do `GET` sem lista para mostrar. `describeLoadError` fala de evento
 * cancelado/indisponível (404/410), que aqui não existem: o que sobra de
 * status vira o erro genérico com retry.
 */
function describeSearchLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout' || loadError.kind === 'server') {
    return loadError;
  }
  return describeLoadError(null);
}

/**
 * "Ver todos" dos eventos da busca (`GET /search/events`), paginado por cursor.
 *
 * - `error` só existe quando não há lista para mostrar; falha ao carregar mais
 *   vira toast com "Tentar de novo" e mantém o que já apareceu.
 * - Uma trava (`inFlight`) impede que um scroll rápido dispare várias páginas.
 * - `404 Tag not found`: avisa, descarta as tags do filtro e recarrega.
 * - `400`: erro de programação do app. Loga, para a paginação e mostra o erro genérico.
 * - O `401` é do `apiFetch` (apaga a sessão e vai para o Login); aqui só se ignora.
 */
export function useSearchEvents({ q, tagIds, dateFrom, dateTo }: SearchEventsParams) {
  const { addToast } = useToast();
  const [items, setItems] = useState<SearchEventItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  // Cada recarga invalida o que ainda estava em voo: a página de um filtro
  // antigo que chega depois é descartada.
  const generation = useRef(0);
  const mounted = useRef(true);
  // Depois de uma falha ao carregar mais, o fim da lista para de pedir sozinho
  // (o `onEndReached` dispara a cada rolagem): só o "Tentar de novo" volta.
  const loadMorePaused = useRef(false);
  /** Tags em uso: começam as da origem e são zeradas pelo `404 Tag not found`. */
  const activeTagIds = useRef<string[]>([]);

  const tagKey = (tagIds ?? []).join(',');

  const fetchPage = useCallback(async (mode: 'initial' | 'more') => {
    if (mode === 'more' && inFlight.current) return;
    inFlight.current = true;
    const replace = mode === 'initial';
    const current = replace ? ++generation.current : generation.current;
    const cursor = replace ? null : cursorRef.current;

    loadMorePaused.current = false;
    if (replace) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const page = await apiFetch<SearchEventsResponse>(
        endpoints.searchEvents({
          q,
          tagIds: activeTagIds.current,
          dateFrom,
          dateTo,
          limit: PAGE_LIMIT,
          cursor,
        }),
      );
      if (!mounted.current || current !== generation.current) return;

      cursorRef.current = page.next_cursor;
      setHasMore(page.next_cursor !== null);
      setTotal(page.total);
      setError(null);
      setItems(previous => {
        if (replace) return page.items;
        const seen = new Set(previous.map(item => item.event_id));
        return [...previous, ...page.items.filter(item => !seen.has(item.event_id))];
      });
    } catch (caught) {
      if (!mounted.current || current !== generation.current) return;
      // O `apiFetch` já avisa a sessão expirada e volta para o Login.
      if (isApiErrorLike(caught) && caught.status === 401) return;

      if (isApiErrorLike(caught) && caught.status === 404 && activeTagIds.current.length > 0) {
        addToast({ type: 'warning', message: 'Essa categoria não existe mais' });
        activeTagIds.current = [];
        // Solta a trava antes de recarregar: o `finally` desta chamada só
        // libera quando a geração ainda é a atual.
        inFlight.current = false;
        void fetchPage('initial');
        return;
      }

      if (isApiErrorLike(caught) && caught.status === 400) {
        console.warn('[api] requisição inválida em /search/events:', caught.detail);
        setHasMore(false);
        if (replace) setError(describeSearchLoadError(caught));
        else addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
        return;
      }

      const loadError = describeSearchLoadError(caught);
      if (replace) {
        setError(loadError);
        return;
      }
      loadMorePaused.current = true;
      addToast({
        type: 'error',
        message: loadError.message,
        actionLabel: 'Tentar de novo',
        onAction: () => { void fetchPage('more'); },
      });
    } finally {
      if (current === generation.current) {
        inFlight.current = false;
        if (mounted.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
  }, [addToast, q, dateFrom, dateTo]);

  const loadMore = useCallback(() => {
    if (!hasMore || inFlight.current || loadMorePaused.current) return;
    void fetchPage('more');
  }, [hasMore, fetchPage]);

  /** Refaz só a requisição que falhou: a primeira página. */
  const retry = useCallback(() => { void fetchPage('initial'); }, [fetchPage]);

  useEffect(() => {
    mounted.current = true;
    activeTagIds.current = tagKey ? tagKey.split(',') : [];
    void fetchPage('initial');
    return () => {
      mounted.current = false;
    };
  }, [fetchPage, tagKey]);

  return { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, retry };
}
