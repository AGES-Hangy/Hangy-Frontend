import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { API_BASE_URL } from '@/constants/api';
import { getToken, removeToken } from '@/utils/auth';

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

const REQUEST_TIMEOUT_MS = 10000;

function toEvent(item: ApiFeedItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
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

export function useFeed() {
  const { showInfoToast } = useToast();
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const latestRequestIdRef = useRef(0);

  const loadFeed = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      const requestId = ++latestRequestIdRef.current;

      if (!silent) {
        setIsLoading(true);
        setError(null);
        setIsOffline(false);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/feed`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (requestId !== latestRequestIdRef.current) return;

        if (!response.ok) {
          if (response.status === 401) {
            await removeToken();
            showInfoToast('Sua sessão expirou. Entre de novo.');
            router.replace('/Login');
            return;
          }

          if (silent) {
            showInfoToast('Não foi possível atualizar agora.');
          } else {
            setError(
              'Não foi possível carregar agora. Já estamos sabendo do problema - tente de novo em alguns instantes',
            );
          }
          return;
        }

        const data = (await response.json()) as ApiFeedResponse;
        if (requestId !== latestRequestIdRef.current) return;

        setSections(normalizeFeed(data));
        setError(null);
        setIsOffline(false);
      } catch (requestError) {
        if (requestId !== latestRequestIdRef.current) return;

        const offline = requestError instanceof TypeError;

        if (silent) {
          showInfoToast(
            offline ? 'Sem conexão para atualizar agora.' : 'A atualização demorou demais.',
          );
        } else {
          setIsOffline(offline);
          setError(
            offline
              ? 'o Hangy precisa de conexão para carregar eventos e o mapa Ao vivo. Verifique o Wi-Fi ou os dados móveis.'
              : 'A conexão demorou demais',
          );
        }
      } finally {
        clearTimeout(timeout);
        if (!silent && requestId === latestRequestIdRef.current) setIsLoading(false);
      }
    },
    [showInfoToast],
  );

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const refresh = useCallback(() => loadFeed({ silent: true }), [loadFeed]);

  return { sections, isLoading, error, isOffline, reload: loadFeed, refresh };
}