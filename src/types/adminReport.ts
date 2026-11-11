import type { ReportReason, ReportStatus, UserModerationStatus } from '@/types/admin';

/**
 * Contrato de `GET /admin/reports/{report_id}` (task 245 [BE]) e de
 * `PATCH /admin/reports/{report_id}/archive` (task 246 [BE]), espelhando
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
}
