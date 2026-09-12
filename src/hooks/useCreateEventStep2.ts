import { useRef, useState } from 'react';
import { router } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';
import { getToken, removeToken } from '@/utils/auth';

type EventId = string;

type PublishEventBody = {
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  tag_ids: string[];
  event_date: string;
  end_date: string;
  location: { latitude: number; longitude: number };
  location_name: string | null;
  max_participants: number | null;
  privacy: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
};

type PublishEventResponse = {
  event_id: string;
  title: string;
  status: string;
  privacy: string;
  event_date: string;
};

type UpdatePrivacyResponse = {
  event_id: string;
  privacy: string;
  updated_at: string;
};

type InviteLinkResponse = {
  invite_id: string;
  token: string;
  url: string;
  expires_at: string;
};

type SendInvitesResponse = {
  invited: Array<{ user_id: string; status: string }>;
  skipped: string[];
};

async function authorizedFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const token = await getToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401) {
    await removeToken();
    router.replace('/Login');
    throw new Error('401');
  }

  return response;
}

export function useCreateEventStep2() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLinkError, setInviteLinkError] = useState<string | null>(null);
  const publishingRef = useRef(false);

  async function publishEvent(body: PublishEventBody): Promise<PublishEventResponse | null> {
    if (publishingRef.current) return null;
    publishingRef.current = true;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (response.status === 400) {
        const json = (await response.json()) as { detail: string };
        setPublishError(json.detail);
        return null;
      }

      if (!response.ok) {
        setPublishError('Não foi possível criar o evento');
        return null;
      }

      return (await response.json()) as PublishEventResponse;
    } catch (error) {
      if (error instanceof Error && error.message === '401') return null;
      setPublishError('Não foi possível criar o evento');
      return null;
    } finally {
      setIsPublishing(false);
      publishingRef.current = false;
    }
  }

  async function updatePrivacy(
    eventId: EventId,
    privacy: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
  ): Promise<UpdatePrivacyResponse | null> {
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/privacy`, {
        method: 'PATCH',
        body: JSON.stringify({ privacy }),
      });

      if (!response.ok) {
        const json = (await response.json()) as { detail: string };
        setPublishError(json.detail);
        return null;
      }

      return (await response.json()) as UpdatePrivacyResponse;
    } catch (error) {
      if (error instanceof Error && error.message === '401') return null;
      return null;
    }
  }

  async function generateInviteLink(eventId: EventId): Promise<string | null> {
    setIsGeneratingLink(true);
    setInviteLinkError(null);

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/invite-link`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const json = (await response.json()) as { detail: string };
        setInviteLinkError(json.detail);
        return null;
      }

      const json = (await response.json()) as InviteLinkResponse;
      setInviteUrl(json.url);
      return json.url;
    } catch (error) {
      if (error instanceof Error && error.message === '401') return null;
      setInviteLinkError('Não foi possível gerar o link');
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function sendInvites(
    eventId: EventId,
    userIds: string[],
  ): Promise<SendInvitesResponse | null> {
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/events/${eventId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ user_ids: userIds }),
      });

      if (!response.ok) {
        const json = (await response.json()) as { detail: string };
        setPublishError(json.detail);
        return null;
      }

      return (await response.json()) as SendInvitesResponse;
    } catch (error) {
      if (error instanceof Error && error.message === '401') return null;
      return null;
    }
  }

  return {
    publishEvent,
    updatePrivacy,
    generateInviteLink,
    sendInvites,
    isPublishing,
    publishError,
    inviteUrl,
    isGeneratingLink,
    inviteLinkError,
  };
}
