import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useToast } from '@/components/Toast';
import { describeListLoadError, isApiErrorLike, type LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

import type { Event, EventPrivacy } from '@/components/EventCard/types';

export interface FeedSection {
  tag: { id: string; name: string };
  items: Event[];
  hasMore: boolean;
}

interface ApiFeedItem {
  event_id: string;
  title: string;
  event_date: string | null;
  location_name: string | null;
  cover_photo_url?: string | null;
  privacy: EventPrivacy;
  participants_count?: number;
  /** Se quem está vendo favoritou o evento — mesmo valor de `viewer.is_favorited` no detalhe. */
  is_favorited?: boolean;
  /** Tag(s) do próprio evento que casaram com esta seção (ex.: "Futebol" em "Esportes"). */
  tags?: { id: string; name: string }[];
}

interface ApiFeedSection {
  tag: { id: string; name: string };
  items: ApiFeedItem[];
  has_more?: boolean;
}

interface ApiFeedResponse {
  sections?: ApiFeedSection[];
}

function toEvent(item: ApiFeedItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
    isFavorited: item.is_favorited ?? false,
  };
}

function normalizeFeed(data: ApiFeedResponse): FeedSection[] {
  return (data.sections ?? []).map((section) => ({
    tag: section.tag,
    items: [...(section.items ?? [])]
      .sort((first, second) => {
        if (!first.event_date) return second.event_date ? 1 : 0;
        if (!second.event_date) return -1;
        return new Date(first.event_date).getTime() - new Date(second.event_date).getTime();
      })
      .map((item) => ({
        ...toEvent(item),
        // A tag micro do próprio evento (ex.: "Futebol"); a macro da seção
        // ("Esportes") já é o título da seção, repeti-la no card é redundante.
        tags: item.tags?.length ? item.tags.map((tag) => tag.name) : [section.tag.name],
      })),
    hasMore: section.has_more ?? false,
  }));
}

// No módulo, e não em estado: quem invalida (ex.: Editar perfil, ao salvar as
// tags) não está na árvore da Home, que continua montada na tab bar.
let isFeedStale = false;
let discardCachedFeed = false;
let feedRevision = 0;

/** Marca o feed como desatualizado: ele é recarregado na próxima visita à Home. */
export function invalidateFeed({ discardCache = false }: { discardCache?: boolean } = {}) {
  isFeedStale = true;
  discardCachedFeed ||= discardCache;
  ++feedRevision;
}

export function useFeed() {
  const { addToast, showInfoToast } = useToast();
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  const latestRequestIdRef = useRef(0);

  const loadFeed = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      const requestId = ++latestRequestIdRef.current;
      const revision = feedRevision;

      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      try {
        // `apiFetch` cuida do token, do timeout e do 401 global (toast + Login).
        const data = await apiFetch<ApiFeedResponse>('/feed');
        if (requestId !== latestRequestIdRef.current || revision !== feedRevision) return;

        setSections(normalizeFeed(data));
        setError(null);
      } catch (caught) {
        if (requestId !== latestRequestIdRef.current || revision !== feedRevision) return;
        if (isApiErrorLike(caught) && caught.status === 401) return;

        const failure = describeListLoadError(caught);
        if (silent) {
          // Com o feed na tela, a falha da atualização não engole o conteúdo.
          if (failure.kind === 'timeout') {
            // Contrato global: timeout é `Toast/Error` com "Tentar de novo".
            addToast({
              type: 'error',
              message: 'A conexão demorou demais',
              actionLabel: 'Tentar de novo',
              onAction: () => void loadFeed({ silent: true }),
            });
          } else {
            showInfoToast(
              failure.kind === 'offline' ? 'Sem conexão para atualizar agora.' : 'Não foi possível atualizar agora.',
            );
          }
        } else {
          setError(failure);
        }
      } finally {
        if (!silent && requestId === latestRequestIdRef.current) setIsLoading(false);
      }
    },
    [addToast, showInfoToast],
  );

  useEffect(() => {
    // A carga inicial já traz o feed atual.
    isFeedStale = false;
    discardCachedFeed = false;
    void loadFeed();
  }, [loadFeed]);

  const refresh = useCallback(() => loadFeed({ silent: true }), [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      if (!isFeedStale) return;
      isFeedStale = false;
      const discard = discardCachedFeed;
      discardCachedFeed = false;
      if (discard) setSections([]);
      void loadFeed({ silent: !discard });
    }, [loadFeed]),
  );

  return { sections, isLoading, error, reload: loadFeed, refresh };
}