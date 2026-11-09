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
