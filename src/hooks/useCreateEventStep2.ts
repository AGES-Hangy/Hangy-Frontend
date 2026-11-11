import { useRef, useState } from 'react';

import { INVALID_COVER_PHOTO_URL, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

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
  /** Derivados do endereço escolhido; `null` quando o Nominatim não devolve. */
  location_neighborhood: string | null;
  location_city: string | null;
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

/** `invalid-cover` sai sem `publishError`: a tela mostra o erro no campo da capa. */
type PublishEventResult =
  | { kind: 'published'; event: PublishEventResponse }
  | { kind: 'invalid-cover' }
  | { kind: 'failed' };

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

/**
 * Texto da falha de escrita. O 401 devolve `null`: o `apiFetch` já mostrou o
 * "sessão expirou" e voltou para o Login, então não há o que dizer aqui.
 */
function failureMessage(error: unknown, fallback: string): string | null {
  if (!isApiErrorLike(error)) return fallback;
  if (error.status === 401) return null;
  if (error.kind === 'network') return 'Sem conexão com a internet';
  if (error.kind === 'timeout') return 'A conexão demorou demais';
  return error.detail || fallback;
}

export function useCreateEventStep2() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteLinkError, setInviteLinkError] = useState<string | null>(null);
  const publishingRef = useRef(false);

  async function publishEvent(body: PublishEventBody): Promise<PublishEventResult> {
    if (publishingRef.current) return { kind: 'failed' };
    publishingRef.current = true;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const event = await apiFetch<PublishEventResponse>('/events', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return { kind: 'published', event };
    } catch (error) {
      if (isApiErrorLike(error) && error.status === 400) {
        if (error.detail === INVALID_COVER_PHOTO_URL) return { kind: 'invalid-cover' };
        setPublishError(
          error.detail === 'Event date must be in the future'
            ? 'Essa data já passou. Escolha o dia de hoje ou uma data futura.'
            : error.detail || 'Não foi possível criar o evento',
        );
        return { kind: 'failed' };
      }
      // Só o 400 traz um `detail` pensado para o usuário; o resto é genérico.
      const message = failureMessage(error, 'Não foi possível criar o evento');
      if (message !== null) {
        setPublishError(isApiErrorLike(error) && error.kind === 'http' ? 'Não foi possível criar o evento' : message);
      }
      return { kind: 'failed' };
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
      return await apiFetch<UpdatePrivacyResponse>(`/events/${eventId}/privacy`, {
        method: 'PATCH',
        body: JSON.stringify({ privacy }),
      });
    } catch (error) {
      const message = failureMessage(error, 'Não foi possível alterar a privacidade');
      if (message !== null) setPublishError(message);
      return null;
    }
  }

  async function generateInviteLink(eventId: EventId): Promise<string | null> {
    setIsGeneratingLink(true);
    setInviteLinkError(null);

    try {
      const json = await apiFetch<InviteLinkResponse>(`/events/${eventId}/invite-link`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setInviteUrl(json.url);
      return json.url;
    } catch (error) {
      const message = failureMessage(error, 'Não foi possível gerar o link');
      if (message !== null) setInviteLinkError(message);
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
      return await apiFetch<SendInvitesResponse>(`/events/${eventId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ user_ids: userIds }),
      });
    } catch (error) {
      const message = failureMessage(error, 'Não foi possível enviar os convites');
      if (message !== null) setPublishError(message);
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
