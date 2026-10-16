import type { EventPrivacy, ParticipationStatus, UserType } from '@/types/event';

export type ConnectionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

/** Quem pediu a conexão pendente, visto por quem está logado. */
export type ConnectionDirection = 'SENT' | 'RECEIVED';

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
  /*
   * Os três campos abaixo vêm do contrato da task 281 [BE], ainda sem
   * implementação: até ela entrar, a API não os devolve.
   */
  /** Só em `PENDING` e `CONFIRMED`; `null` sem conexão e em `REJECTED`. */
  connection_id?: string | null;
  /** Só em `PENDING`. */
  connection_direction?: ConnectionDirection | null;
  /** Só se aplica a `BUSINESS`; `null` em pessoa. */
  followers_count?: number | null;
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

/** Resposta de `PATCH /connections/{connection_id}`, pelo contrato da task 230 [BE]. */
export interface ConnectionAnswerResult {
  connection_id: string;
  requester_id: string;
  receiver_id: string;
  status: Extract<ConnectionStatus, 'CONFIRMED' | 'REJECTED'>;
  updated_at: string;
}

export interface UserEventItem {
  event_id: string;
  title: string;
  event_date: string;
  location_name: string | null;
  cover_photo_url: string | null;
  privacy: EventPrivacy;
  /** Sempre `null` para quem visita; para o dono, `CONFIRMED` quando ele confirmou presença. */
  participation_status: ParticipationStatus | null;
}

export interface UserEventsPage {
  items: UserEventItem[];
  next_cursor: string | null;
}

export type UserEventsTab = 'history' | 'created' | 'interests' | 'confirmed';

/** `null` é aba não permitida a quem pede; aba permitida e vazia vem com `items` vazio. */
export type UserEventsTabs = Record<UserEventsTab, UserEventsPage | null>;

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
