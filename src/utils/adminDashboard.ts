import type { StatCardProps } from '@/components/StatCard/types';
import type {
  AdminDashboard,
  AdminDashboardRecentReport,
  RecentReportCardModel,
  ReportReason,
  ReportTargetType,
} from '@/types/admin';
import { formatRelativeTime } from '@/utils/datetime';

export type DashboardStat = {
  key: 'reportsOpen' | 'reportsInReview' | 'activeUsers' | 'suspendedAccounts';
} & Pick<StatCardProps, 'label' | 'value' | 'support' | 'tone'>;

/** `4821` -> `4.821`. Sem `Intl`, pelo mesmo motivo de `utils/datetime.ts`. */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}

/** Com o número em 0, a chave `support` nem existe. */
function supportFor(count: number, text: string): Pick<DashboardStat, 'support'> {
  return count > 0 ? { support: text } : {};
}

/** Na ordem da grade do Figma. Com o número de apoio em 0, a chave `support` não existe e a linha some. */
export function dashboardStats(dashboard: AdminDashboard): DashboardStat[] {
  const {
    reports_open,
    reports_open_last_24h,
    reports_in_review,
    reports_in_review_moderators,
    active_users,
    active_users_new_this_week,
    suspended_accounts,
    suspended_accounts_expiring_today,
  } = dashboard;

  return [
    {
      key: 'reportsOpen',
      label: 'Denúncias abertas',
      value: formatCount(reports_open),
      ...supportFor(reports_open_last_24h, `+${formatCount(reports_open_last_24h)} nas últimas 24 h`),
      tone: reports_open > 0 ? 'Alert' : 'Neutral',
    },
    {
      key: 'reportsInReview',
      label: 'Em análise',
      value: formatCount(reports_in_review),
      ...supportFor(reports_in_review_moderators, `por ${plural(reports_in_review_moderators, 'moderador', 'moderadores')}`),
      tone: 'Neutral',
    },
    {
      key: 'activeUsers',
      label: 'Usuários ativos',
      value: formatCount(active_users),
      ...supportFor(active_users_new_this_week, `+${formatCount(active_users_new_this_week)} esta semana`),
      tone: 'Neutral',
    },
    {
      key: 'suspendedAccounts',
      label: 'Contas suspensas',
      value: formatCount(suspended_accounts),
      ...supportFor(suspended_accounts_expiring_today, plural(suspended_accounts_expiring_today, 'expira hoje', 'expiram hoje')),
      tone: 'Neutral',
    },
  ];
}

/** Rótulos iguais aos de `GET /reports/reasons`, para o admin ver o que quem denunciou escolheu. */
const REASON_LABELS: Record<ReportReason, string> = {
  HARASSMENT: 'Assédio ou intimidação',
  SPAM: 'Spam ou golpe',
  HATE_SPEECH: 'Discurso de ódio',
  FAKE_PROFILE: 'Perfil falso',
  INAPPROPRIATE_CONTENT: 'Conteúdo inapropriado',
  SAFETY_CONCERN: 'Violação de segurança',
  // Fora das listas de `GET /reports/reasons`: texto a validar no PR.
  MISLEADING_EVENT: 'Evento enganoso',
  OTHER: 'Outro',
};

/** Aceita qualquer string para um motivo novo do backend não quebrar a tela. */
export function reportReasonLabel(reason: ReportReason | (string & {})): string {
  return Object.prototype.hasOwnProperty.call(REASON_LABELS, reason)
    ? REASON_LABELS[reason as ReportReason]
    : REASON_LABELS.OTHER;
}

/** Estabelecimento é uma conta: usa o card de pessoa. */
export function reportTargetOf(type: ReportTargetType | null): RecentReportCardModel['target'] {
  return type === 'EVENT' ? 'Evento' : 'Pessoa';
}

const UNNAMED_TARGET: Record<ReportTargetType, string> = {
  USER: 'Usuário sem nome',
  BUSINESS: 'Estabelecimento sem nome',
  EVENT: 'Evento sem título',
};

export function reportTargetName(type: ReportTargetType | null, name: string | null): string {
  if (type === null) return 'Alvo indisponível';
  return name?.trim() ? name : UNNAMED_TARGET[type];
}

/** `3 denúncias · há 2 h`; sem data válida, só a contagem. */
export function reportSubtitle(count: number, openedAt: string): string {
  const reports = plural(count, 'denúncia', 'denúncias');
  const when = formatRelativeTime(openedAt);
  return when ? `${reports} · ${when}` : reports;
}

export function recentReportCard(report: AdminDashboardRecentReport): RecentReportCardModel {
  return {
    target: reportTargetOf(report.target_type),
    targetName: reportTargetName(report.target_type, report.target_name),
    targetImageUrl: null,
    subtitle: reportSubtitle(report.report_count, report.opened_at),
    moderationStatus: report.status,
    reason: reportReasonLabel(report.reason),
    descriptionExcerpt: report.description_excerpt,
  };
}
