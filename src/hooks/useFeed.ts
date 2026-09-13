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