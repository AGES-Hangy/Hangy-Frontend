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

/**
 * Contrato de `GET /admin/users/{user_id}` (task 249 [BE]).
 * Ficha completa do usuário para moderação.
 */
export interface AdminUserProfile {
  user_id: string;
  name: string;
  /** URI da foto de perfil, ou `null` quando não há foto. */
  avatar_url: string | null;
  email: string;
  /** ISO 8601 — data de cadastro. */
  joined_at: string;
  moderation_status: UserModerationStatus;
  /** Presente quando `moderation_status` é `SUSPENDED`. ISO 8601. */
  suspended_until: string | null;
  /** Presente quando `moderation_status` é `BANNED`. ISO 8601. */
  banned_at: string | null;
  /** Total de eventos criados pelo usuário. */
  events_created: number;
  /** Total de denúncias recebidas (em qualquer status). */
  reports_received: number;
  /** Denúncias ainda abertas (PENDING ou REVIEWED). */
  reports_open: number;
}

/** Ação de moderação enviada para `POST /admin/users/{user_id}/moderation`. */
export type ModerationAction = 'BAN' | 'SUSPEND' | 'REVERT';

/** Corpo do `POST /admin/users/{user_id}/moderation`. */
export interface ModerationPayload {
  action: ModerationAction;
  /**
   * Presente apenas quando `action === 'SUSPEND'`.
   * ISO 8601 — data/hora de fim da suspensão.
   */
  suspended_until?: string;
}

/** Resposta do `POST /admin/users/{user_id}/moderation`. */
export interface ModerationResult {
  user_id: string;
  moderation_status: UserModerationStatus;
  suspended_until: string | null;
  banned_at: string | null;
}
