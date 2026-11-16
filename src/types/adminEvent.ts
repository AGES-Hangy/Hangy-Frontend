import type { UserModerationStatus } from '@/types/admin';
import type { EventModerationStatus } from '@/types/adminReport';
import type { EventPrivacy } from '@/components/EventCard/types';

/** `EventStatusEnum` do backend. */
export type AdminEventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';

/**
 * Contrato de `GET /admin/events/{event_id}` (`AdminEventDetailOutput`):
 * a ficha de moderação de um evento, sem as regras de visibilidade do app.
 */
export interface AdminEventDetail {
  event_id: string;
  title: string;
  description: string | null;
  /** ISO 8601. */
  event_date: string;
  /** ISO 8601. */
  end_date: string;
  location_name: string | null;
  location_neighborhood: string | null;
  location_city: string | null;
  /** Ponto exato, mesmo em evento privado. */
  latitude: number;
  longitude: number;
  privacy: EventPrivacy;
  status: AdminEventStatus | (string & {});
  moderation_status: EventModerationStatus | (string & {});
  /** ISO 8601; só depois de "Remover evento". */
  removed_at: string | null;
  cover_photo_url: string | null;
  max_participants: number | null;
  /** ISO 8601. */
  created_at: string;
  tags: string[];
  organizer: {
    user_id: string;
    name: string | null;
    photo_url: string | null;
    moderation_status: UserModerationStatus | (string & {});
    event_count: number;
    /** Denúncias não arquivadas contra o perfil do organizador. */
    report_count: number;
  };
  metrics: {
    /** Participações confirmadas. */
    participant_count: number;
    /** Solicitações pendentes. */
    pending_count: number;
    /** Denúncias não arquivadas contra o evento. */
    report_count: number;
    /** Denúncias que terminaram com o evento removido. */
    report_upheld_count: number;
  };
}
