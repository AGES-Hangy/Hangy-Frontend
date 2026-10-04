import type { EventPrivacy, UserType } from '@/types/event';

export type ConnectionStatus = 'PENDING' | 'CONFIRMED';

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
  is_blocked: boolean;
  connections_count: number;
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
