/**
 * Contrato de `GET /admin/reports/{report_id}` (task 245 [BE]) e de
 * `PATCH /admin/users/{user_id}/moderation` (task 249 [BE]).
 */

/** `ReportStatusEnum` do backend. `REJECTED` é a denúncia arquivada. */
export type AdminReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';

/** `ModerationStatusEnum` do backend. */
export type ModerationStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

/** `ReportTypeEnum` do backend. */
export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'FAKE_PROFILE'
  | 'HATE_SPEECH'
  | 'MISLEADING_EVENT'
  | 'SAFETY_CONCERN'
  | 'OTHER';

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
  moderation_status: ModerationStatus | (string & {});
}

export interface AdminReportResolution {
  resolved_by: AdminReportUser;
  resolved_at: string;
  action: ReportResolutionAction;
}

export interface AdminReportDetail {
  report_id: string;
  report_number: number;
  status: AdminReportStatus | (string & {});
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
  report_count: number;
  status: AdminReportStatus | (string & {});
  reason: ReportReason | (string & {});
  description_excerpt: string;
  opened_at: string;
}

export interface AdminReportQueuePage {
  items: AdminReportQueueItem[];
  next_cursor: string | null;
}

/** Corpo de `PATCH /admin/users/{user_id}/moderation`. */
export type AdminUserModerationInput =
  | { action: 'BAN'; report_id?: string }
  | { action: 'SUSPEND'; duration_days: number; report_id?: string };

export interface AdminUserModerationOutput {
  user_id: string;
  name: string | null;
  email: string;
  moderation_status: ModerationStatus;
  suspended_until: string | null;
  created_at: string;
}
