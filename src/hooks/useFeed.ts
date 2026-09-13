import { useCallback, useEffect, useState } from 'react';
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
      .map((item) => ({ ...toEvent(item), tags: [section.tag.name] })),
    hasMore: section.has_more ?? false,
  }));
}

export function useFeed() {
  const { showInfoToast } = useToast();
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          await removeToken();
          showInfoToast('Sua sessão expirou. Entre de novo.');
          router.replace('/Login');
        } else {
          setError('Não foi possível carregar agora. Já estamos sabendo do problema - tente de novo em alguns instantes');
        }
        return;
      }

      const data = (await response.json()) as ApiFeedResponse;
      setSections(normalizeFeed(data));
    } catch (requestError) {
      const offline = requestError instanceof TypeError;
      setIsOffline(offline);
      setError(offline ? 'o Hangy precisa de conexão para carregar eventos e o mapa Ao vivo. Verifique o Wi-Fi ou os dados móveis.' : 'A conexão demorou demais');
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }, [showInfoToast]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  return { sections, isLoading, error, isOffline, reload: loadFeed };
}

import { useCallback, useEffect, useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';

export interface FeedTag {
  id: string;
  name: string;
}

export interface FeedEvent {
  eventId: string;
  title: string;
  eventDate: string;
  locationName: string;
  coverPhotoUrl: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  participantsCount: number;
}

export interface FeedSection {
  tag: FeedTag;
  items: FeedEvent[];
  hasMore: boolean;
}

interface FeedResponseDTO {
  sections: {
    tag: { id: string; name: string };
    items: {
      event_id: string;
      title: string;
      event_date: string;
      location_name: string;
      cover_photo_url: string;
      privacy: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
      participants_count: number;
    }[];
    has_more: boolean;
  }[];
}

function mapSections(dto: FeedResponseDTO): FeedSection[] {
  return dto.sections.map((section) => ({
    tag: section.tag,
    hasMore: section.has_more,
    items: section.items.map((item) => ({
      eventId: item.event_id,
      title: item.title,
      eventDate: item.event_date,
      locationName: item.location_name,
      coverPhotoUrl: item.cover_photo_url,
      privacy: item.privacy,
      participantsCount: item.participants_count,
    })),
  }));
}

const DEFAULT_LIMIT = 10;

export function useFeed(limit = DEFAULT_LIMIT) {
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setError(null);

    try {
      const token = await getToken();

      const response = await fetch(`${API_BASE_URL}/feed?limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.detail ?? 'Não foi possível carregar o feed');
        return false;
      }

      const data: FeedResponseDTO = await response.json();
      setSections(mapSections(data));
      return true;
    } catch {
      setError('Não foi possível conectar ao servidor');
      return false;
    }
  }, [limit]);

  useEffect(() => {
    setIsLoading(true);
    fetchFeed().finally(() => setIsLoading(false));
  }, [fetchFeed]);

  return { sections, isLoading, error, refetch: fetchFeed };
}