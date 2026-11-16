import type { ReportReason, ReportStatus, UserModerationStatus } from '@/types/admin';

/**
 * Contrato de `GET /admin/reports/{report_id}` (task 245 [BE]), de
 * `PATCH /admin/reports/{report_id}/archive` (task 246 [BE]) e de
 * `PATCH /admin/events/{event_id}/moderation`, espelhando
 * `app/presentation/dtos/admin_report.py`. Motivo, status da denúncia e status
 * da conta são os mesmos tipos de `@/types/admin`.
 */

/** `ReportResolutionActionEnum` do backend. */
export type ReportResolutionAction = 'BANNED' | 'SUSPENDED' | 'ARCHIVED' | 'EVENT_REMOVED' | (string & {});

export interface AdminReportUser {
  id: string;
  name: string | null;
}

export interface AdminReportTarget {
  type: 'USER' | 'BUSINESS' | 'EVENT';
  /** Conta responsável pelo alvo — para evento, o organizador. É o `user_id` das ações. */
  id: string;
  name: string | null;
  /** `YYYY-MM-DD`. */
  member_since: string;
  event_count: number;
  moderation_status: UserModerationStatus | (string & {});
}

/** `EventModerationStatusEnum` do backend. */
export type EventModerationStatus = 'ACTIVE' | 'REMOVED';

/**
 * O evento denunciado. Só vem quando `target.type === 'EVENT'`
 * (AGES-Hangy/Hangy-Backend#136); `id` é o `event_id` de "Remover evento".
 */
export interface AdminReportEvent {
  id: string;
  title: string;
  moderation_status: EventModerationStatus | (string & {});
}

/** Corpo de `PATCH /admin/events/{event_id}/moderation`. Hoje só existe `REMOVE`. */
export interface EventModerationPayload {
  action: 'REMOVE';
  report_id?: string;
}

/** Resposta de `PATCH /admin/events/{event_id}/moderation`. */
export interface EventModerationResult {
  event_id: string;
  moderation_status: EventModerationStatus;
  removed_at: string;
  report_id: string | null;
  report_status: string | null;
}

/** Organizador por trás de um evento denunciado. Só vem quando `target.type === 'EVENT'`. */
export interface AdminReportOrganizer {
  user_id: string;
  name: string | null;
  photo_url: string | null;
  moderation_status: UserModerationStatus | (string & {});
  events_count: number;
  reports_count: number;
}

export interface AdminReportResolution {
  resolved_by: AdminReportUser;
  resolved_at: string;
  action: ReportResolutionAction;
}

export interface AdminReportDetail {
  report_id: string;
  report_number: number;
  status: ReportStatus | (string & {});
  opened_at: string;
  target: AdminReportTarget;
  reason: ReportReason | (string & {});
  description: string;
  reported_by: AdminReportUser;
  reported_at: string;
  previous_reports: {
    total: number;
    archived: number;
    resolved_with_action: number;
  };
  resolution: AdminReportResolution | null;
  /** Ausente fora de denúncias de evento. */
  organizer?: AdminReportOrganizer | null;
  /** Ausente fora de denúncias de evento (e no backend anterior ao #136). */
  event?: AdminReportEvent | null;
  /**
   * Denúncias abertas (pendentes ou em análise) contra o mesmo alvo, esta
   * incluída: o "N relatos" do frame. Ausente no backend anterior.
   */
  open_report_count?: number;
}

/**
 * Linha de `GET /admin/reports` (task 244 [BE]). A fila é agrupada por alvo:
 * a linha é a denúncia mais recente dele, e `report_count` soma as demais.
 */
export interface AdminReportQueueItem {
  report_id: string;
  report_number: number;
  /** `null` quando o alvo da denúncia não existe mais. */
  target_type: AdminReportTarget['type'] | null;
  /** Nome da conta ou título do evento. */
  target_name: string | null;
  /** Só em linha de evento: quem organiza. Ausente no backend anterior à ficha de evento. */
  organizer_name?: string | null;
  report_count: number;
  status: ReportStatus | (string & {});
  reason: ReportReason | (string & {});
  description_excerpt: string;
  opened_at: string;
}

export interface AdminReportQueuePage {
  items: AdminReportQueueItem[];
  next_cursor: string | null;
}
