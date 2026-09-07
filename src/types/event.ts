/**
 * Contratos da API de eventos — cópia do que as tasks de backend 103, 097,
 * 209 e 099 entregam. Se algo divergir, o backend é a fonte de verdade.
 *
 * Os campos chegam em `snake_case` porque é o que a API devolve; não
 * renomeamos na borda para o diff contra o contrato continuar óbvio.
 */

export type EventPrivacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';

export type ParticipationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REMOVED';

/**
 * Ação principal do rodapé do detalhe. Vem pronta da API justamente para a
 * tela não precisar deduzir de `privacy` + `participation_status`.
 */
export type ViewerAction = 'CONFIRM' | 'CANCEL' | 'REQUEST' | 'SHARE' | 'NONE';

export type UserType = 'PERSONAL' | 'BUSINESS';

export interface EventTag {
  id: string;
  name: string;
}

export interface EventOrganizer {
  id: string;
  name: string;
  user_type: UserType;
  avatar_url?: string | null;
}

export interface EventViewer {
  is_organizer: boolean;
  participation_status: ParticipationStatus | null;
  can_see_participants: boolean;
  available_action: ViewerAction;
}

export interface ParticipantsPreview {
  count: number;
  items: EventParticipant[];
  /** Quantos demonstraram interesse sem confirmar. */
  interested_count?: number;
}

export interface EventDetail {
  event_id: string;
  title: string;
  description: string;
  event_date: string;
  end_date: string;
  location: { latitude: number; longitude: number };
  location_name: string;
  privacy: EventPrivacy;
  status: EventStatus;
  cover_photo_url: string | null;
  tags: EventTag[];
  organizer: EventOrganizer;
  viewer: EventViewer;
  /** Ausente quando o visitante não pode ver quem confirmou. */
  participants_preview?: ParticipantsPreview | null;
  /** Quantas solicitações aguardam o organizador. Só vem para ele. */
  pending_requests_count?: number;
}

export interface EventParticipant {
  participant_id: string;
  user_id: string;
  name: string;
  user_type: UserType;
  avatar_url?: string | null;
  status: ParticipationStatus;
  /** ISO 8601 — usado no "pediu para participar · há 2 h". */
  requested_at?: string | null;
}

export interface ParticipantsResponse {
  confirmed: EventParticipant[];
  pending: EventParticipant[];
  confirmed_count: number;
  pending_count: number;
  /**
   * `false` quando a API responde 403 em pendentes: a tela esconde a seção
   * inteira em vez de mostrar e negar.
   */
  can_manage: boolean;
}
