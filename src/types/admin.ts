/**
 * Contrato de `GET /admin/dashboard` (task 243 [BE]), espelhando
 * `app/presentation/dtos/admin_dashboard.py`. Em qualquer divergência, o
 * backend é a fonte de verdade.
 *
 * Os campos da API ficam em `snake_case`, como em `types/event.ts`.
 */

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

/** `ReportStatusEnum` do backend. */
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED';

export type ReportTargetType = 'USER' | 'BUSINESS' | 'EVENT';

export interface AdminDashboardRecentReport {
  report_id: string;
  /** `null` quando o alvo da denúncia não existe mais. */
  target_type: ReportTargetType | null;
  /** Nome da conta ou título do evento; a conta pode não ter nome. */
  target_name: string | null;
  /** Denúncias contra o mesmo alvo, em qualquer status, contando esta. */
  report_count: number;
  status: ReportStatus;
  reason: ReportReason;
  description_excerpt: string;
  /** ISO 8601. */
  opened_at: string;
}

export interface AdminDashboard {
  reports_open: number;
  reports_open_last_24h: number;
  reports_in_review: number;
  /** Sempre 0 por enquanto: o backend ainda não registra quem revisa. */
  reports_in_review_moderators: number;
  active_users: number;
  active_users_new_this_week: number;
  suspended_accounts: number;
  suspended_accounts_expiring_today: number;
  /** Até 5, só `PENDING` e `REVIEWED`, da mais recente para a mais antiga. */
  recent_reports: AdminDashboardRecentReport[];
}

/**
 * O que a tela entrega ao `ReportCard`, sem `reportNumber`: o backend não tem
 * número de denúncia.
 */
export interface RecentReportCardModel {
  target: 'Pessoa' | 'Evento';
  targetName: string;
  /** A API do painel não manda foto nem capa: o card mostra o ícone. */
  targetImageUrl: null;
  subtitle: string;
  /** Status do backend, sem tradução: o `Badge` de moderação traduz. */
  moderationStatus: ReportStatus;
  /** Motivo já traduzido. */
  reason: string;
  descriptionExcerpt: string;
}

/** Status de moderação de usuário — `UserModerationStatusEnum` do backend. */
export type UserModerationStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

/** Ação registrada no histórico de moderação de um usuário. */
export type ModerationHistoryAction = 'BANNED' | 'SUSPENDED' | 'REVERTED';

/** Uma entrada do histórico de moderação (`AdminModerationEntryOutput` do backend). */
export interface ModerationHistoryEntry {
  action: ModerationHistoryAction | (string & {});
  /** Admin que aplicou a ação; `null` quando a conta dele não existe mais. */
  actor: { id: string; name: string | null } | null;
  /** ISO 8601. */
  occurred_at: string;
  /** Denúncia que motivou a ação, quando houver. */
  report_id: string | null;
}

/** Contagens da ficha (`AdminUserMetricsOutput` do backend). */
export interface AdminUserMetrics {
  /** Eventos criados pelo usuário. */
  event_count: number;
  /** Eventos que ele cancelou. */
  event_cancelled_count: number;
  /**
   * Denúncias recebidas, fora as arquivadas. Hoje o backend soma as contra a
   * conta e as contra os eventos dela.
   */
  report_count: number;
  /** Denúncias procedentes (encerradas com ação). */
  report_upheld_count: number;
}

/**
 * Contrato de `GET /admin/users/{user_id}` (`AdminUserDetailOutput`, task 249 [BE]).
 * A API não manda foto: a ficha mostra o avatar padrão.
 */
export interface AdminUserProfile {
  user_id: string;
  name: string | null;
  email: string;
  /** Data de cadastro, `YYYY-MM-DD`. */
  member_since: string;
  moderation_status: UserModerationStatus;
  /** Presente quando `moderation_status` é `SUSPENDED`. ISO 8601. */
  suspended_until: string | null;
  /** Presente quando `moderation_status` é `BANNED`. ISO 8601. */
  banned_at: string | null;
  metrics: AdminUserMetrics;
  /** Da mais recente para a mais antiga. */
  moderation_history: ModerationHistoryEntry[];
}

/** Ação de moderação enviada para `PATCH /admin/users/{user_id}/moderation`. */
export type ModerationAction = 'BAN' | 'SUSPEND' | 'REVERT';

/** Corpo do `PATCH /admin/users/{user_id}/moderation`. */
export type ModerationPayload =
  | { action: 'BAN'; report_id?: string }
  | { action: 'SUSPEND'; duration_days: number; report_id?: string }
  | { action: 'REVERT' };

/** Resposta do `PATCH /admin/users/{user_id}/moderation` (task 249 [BE]). */
export interface ModerationResult {
  user_id: string;
  name: string | null;
  email: string;
  role: string;
  moderation_status: UserModerationStatus;
  /** Presente apenas quando `moderation_status === 'SUSPENDED'`. ISO 8601. */
  suspended_until: string | null;
  /** ISO 8601 — data de cadastro. */
  created_at: string;
}

/** Item de `GET /admin/users`, espelhando `app/presentation/dtos/admin_users.py`. */
export interface AdminUser {
  user_id: string;
  name: string | null;
  /** `BUSINESS` é conta de estabelecimento; a lista a marca como Empresa. Contas `ADMIN` não vêm. */
  user_type: 'PERSONAL' | 'BUSINESS';
  moderation_status: UserModerationStatus;
  /** ISO 8601. Só vem preenchido com `SUSPENDED`. */
  suspended_until: string | null;
  event_count: number;
  report_count: number;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  next_cursor: string | null;
}

/**
 * Contrato de `GET /admin/audit-log` (task 253 [BE]), espelhando
 * `app/presentation/dtos/audit_log.py`.
 */

/** `AuditActionEnum` do backend. */
export type AuditAction =
  | 'USER_BANNED'
  | 'USER_SUSPENDED'
  | 'USER_REVERTED'
  | 'REPORT_ARCHIVED'
  | 'REPORT_REVIEWED'
  | 'REPORT_RESOLVED'
  | 'EVENT_REMOVED'
  | 'TAG_CREATED'
  | 'TAG_UPDATED'
  | 'TAG_DELETED';

/** `AuditTargetTypeEnum` do backend. */
export type AuditTargetType = 'USER' | 'REPORT' | 'TAG' | 'EVENT';

export interface AuditLogActor {
  /** `null` quando a conta do administrador foi removida. */
  id: string | null;
  /** "Você" quando foi o próprio admin logado; já vem pronto do backend. */
  name: string;
}

export interface AuditLogItem {
  audit_log_id: string;
  actor: AuditLogActor;
  /** Aceita qualquer string para uma ação nova do backend não quebrar a tela. */
  action: AuditAction | (string & {});
  target_type: AuditTargetType | (string & {});
  target_id: string;
  /** Frase pronta, ex.: "Você baniu Lucas Ferreira". A tela só exibe. */
  summary: string;
  /** ISO 8601. */
  created_at: string;
}

export interface AuditLogPage {
  /** Da mais recente para a mais antiga. */
  items: AuditLogItem[];
  /** Próxima página; a tela ainda não pagina. */
  next_cursor: string | null;
}
