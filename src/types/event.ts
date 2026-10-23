/**
 * Contratos da API de eventos — cópia do que as tasks de backend 103, 097,
 * 209 e 099 entregam. Se algo divergir, o backend é a fonte de verdade.
 *
 * Os campos chegam em `snake_case` porque é o que a API devolve; não
 * renomeamos na borda para o diff contra o contrato continuar óbvio.
 */

export type EventPrivacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

/**
 * Quanto do local a API entregou a quem está vendo. Evento privado vem
 * `APPROXIMATE` para quem ainda não foi aprovado; a tela só renderiza isso,
 * sem deduzir nada de `privacy`.
 */
export type LocationPrecision = 'EXACT' | 'APPROXIMATE';

export type EventStatus ='DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';

export type ParticipationStatus =
  | 'INVITED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REMOVED';

/**
 * Ação principal do rodapé do detalhe. Vem pronta da API justamente para a
 * tela não precisar deduzir de `privacy` + `participation_status`.
 */
export type ViewerAction = 'CONFIRM' | 'CANCEL_PRESENCE' | 'REQUEST' | 'SHARE' | 'MANAGE' | 'NONE';

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
  is_favorited: boolean;
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
  /** Opcional na criação — `null` quando o organizador não preencheu. */
  description: string | null;
  event_date: string;
  end_date: string;
  /** Em `APPROXIMATE` é o centro da área, não o ponto do evento. */
  location: { latitude: number; longitude: number };
  /** Endereço em `EXACT`; bairro e cidade em `APPROXIMATE` (`null` sem bairro). */
  location_name: string | null;
  /** Ausente enquanto o backend não entrega a task 270 — tratar como `EXACT`. */
  location_precision?: LocationPrecision;
  /** Raio da área em metros; só faz sentido em `APPROXIMATE`. */
  location_radius_m?: number | null;
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

/**
 * Item de `GET /events/{event_id}/participants` — bem mais magro que
 * `EventParticipant` (o preview do detalhe): sem `avatar_url` nem
 * `user_type`, e `user.name` pode vir `null`.
 */
export interface EventParticipantItem {
  participant_id: string;
  user: { id: string; name: string | null };
  status: ParticipationStatus;
  /** Quando o registro nasceu — é o "pediu para participar" de um pendente. */
  joined_at: string;
}

/**
 * `GET /events/{event_id}/participants` devolve só confirmados por padrão;
 * pendentes exigem `?status=PENDING` numa segunda chamada, e só o organizador
 * pode pedir. Por isso não existe um `can_manage` aqui — quem decide isso é
 * `EventViewer.is_organizer`, do detalhe do evento.
 */
export interface ParticipantsPage {
  items: EventParticipantItem[];
  /** A chave `PENDING` só vem quando quem pediu é o organizador. */
  counts: Partial<Record<'CONFIRMED' | 'PENDING', number>>;
  next_cursor: string | null;
}

export interface EventShare {
  /** Deep link `hangy://…` — abre o app direto se estiver instalado. */
  url: string;
  /** Fallback web — redirecionador simples enquanto não existe página própria. */
  web_url: string;
  title: string;
  event_date: string;
  location_name: string;
  cover_photo_url: string | null;
}

/** Item de `GET /events/nearby` (task 119) — só o que o pin e o preview do mapa usam. */
export interface NearbyEventItem {
  event_id: string;
  title: string;
  event_date: string;
  location: { latitude: number; longitude: number };
  location_name: string | null;
  cover_photo_url: string | null;
  /**
   * Vem do contrato do backend #86, ainda sem merge. Opcional até o endpoint
   * estar disponível: sem o campo, o preview oculta o selo em vez de assumir `PUBLIC`.
   */
  privacy?: EventPrivacy;
  /** Distância até o centro da busca, calculada pelo backend. */
  distance_m: number;
  participants_count: number;
  is_confirmed: boolean;
}

export interface NearbyEventsPage {
  items: NearbyEventItem[];
}
