import type { EventPrivacy, UserType } from '@/types/event';

export type ConnectionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface UserTag {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  user_type: UserType;
  name: string | null;
  description: string | null;
  photo_url: string | null;
  tags: UserTag[];
  /**
   * Só se aplica a `PERSONAL`. `null` quando não há conexão nem solicitação
   * entre quem visita e o perfil.
   */
  connection_status: ConnectionStatus | null;
  /** Só se aplica a `BUSINESS`. */
  is_following: boolean;
  connections_count: number;
}

export interface ConnectionRequestResult {
  connection_id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
}

export interface UserEventItem {
  event_id: string;
  title: string;
  event_date: string | null;
  location_name: string | null;
  cover_photo_url: string | null;
  privacy: EventPrivacy;
}

export interface UserEventsPage {
  items: UserEventItem[];
  next_cursor: string | null;
}

export interface UserPhoto {
  photo_id: string;
  photo_url: string;
  event: { id: string; title: string };
  created_at: string;
}

export interface UserPhotosPage {
  items: UserPhoto[];
  next_cursor: string | null;
}
