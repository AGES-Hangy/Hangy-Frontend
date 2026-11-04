import type { AdminReportDetail, ReportReason } from '@/types/adminReport';
import { formatDayMonth, formatRelativeTime, formatTime } from '@/utils/datetime';

/** Texto de cada `ReportTypeEnum` do backend. */
const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Assédio',
  INAPPROPRIATE_CONTENT: 'Conteúdo impróprio',
  FAKE_PROFILE: 'Perfil falso',
  HATE_SPEECH: 'Discurso de ódio',
  MISLEADING_EVENT: 'Evento enganoso',
  SAFETY_CONCERN: 'Risco à segurança',
  OTHER: 'Outro motivo',
};

export function reportReasonLabel(reason: string): string {
  return REASON_LABEL[reason as ReportReason] ?? 'Outro motivo';
}

/** Denúncia ainda esperando ação: mostra as 3 ações. */
export function isReportOpen(status: string): boolean {
  return status === 'PENDING' || status === 'REVIEWED';
}

/** `Marina Souza` -> `Marina S.`, como nos frames do painel. */
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Conta removida';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** `hoje, 14:32` ou `04/09, 14:32`. */
export function formatShortDateTime(iso: string): string {
  const time = formatTime(iso);
  if (!time) return '';
  return `${isToday(iso) ? 'hoje' : formatDayMonth(iso)}, ${time}`;
}

/** `2025-03-14` -> `03/2025`, sem passar por `Date` (fuso mudaria o dia 1º). */
function formatMonthYear(isoDate: string): string {
  const [year, month] = isoDate.split('-');
  return year && month ? `${month}/${year}` : '';
}

/** Linha de apoio do `AdminUserRow`, conforme o status atual da conta. */
export function targetSummary(report: AdminReportDetail): string {
  const { target, resolution } = report;
  const resolvedOn = resolution ? formatDayMonth(resolution.resolved_at) : '';

  if (target.moderation_status === 'BANNED') {
    return resolution?.action === 'BANNED' && resolvedOn
      ? `Banido em ${resolvedOn} · acesso bloqueado`
      : 'Acesso bloqueado';
  }
  if (target.moderation_status === 'SUSPENDED') {
    return resolution?.action === 'SUSPENDED' && resolvedOn
      ? `Suspenso em ${resolvedOn} · acesso pausado`
      : 'Acesso pausado';
  }

  const since = formatMonthYear(target.member_since);
  const events = `${target.event_count} ${target.event_count === 1 ? 'evento' : 'eventos'}`;
  return since ? `Membro desde ${since} · ${events}` : events;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "2 denúncias anteriores · 1 arquivada e 1 encerrada com ação na conta." */
export function previousReportsSummary(report: AdminReportDetail): string {
  const { total, archived, resolved_with_action: resolved } = report.previous_reports;
  if (total === 0) return 'Nenhuma denúncia anterior contra esta conta.';

  const parts = [
    archived > 0 ? plural(archived, 'arquivada', 'arquivadas') : null,
    resolved > 0 ? plural(resolved, 'encerrada com ação na conta', 'encerradas com ação na conta') : null,
  ].filter(Boolean);

  const head = plural(total, 'denúncia anterior', 'denúncias anteriores');
  return parts.length > 0 ? `${head} · ${parts.join(' e ')}.` : `${head}.`;
}

/** Linha ao lado do badge de estado: quando abriu, ou quando foi encerrada. */
export function reportStateLine(report: AdminReportDetail): string {
  if (isReportOpen(report.status)) {
    const opened = formatRelativeTime(report.opened_at);
    return opened ? `Aberta ${opened}` : '';
  }
  const closedAt = report.resolution?.resolved_at;
  const verb = report.status === 'REJECTED' ? 'Arquivada' : 'Encerrada';
  if (!closedAt) return verb;
  const when = formatShortDateTime(closedAt);
  return `${verb} ${when.startsWith('hoje') ? when : `em ${when}`}`;
}

/** Cabeçalho e texto do card "Resolvida por". */
export function resolutionCopy(report: AdminReportDetail): { title: string; text: string } {
  const archived = report.status === 'REJECTED';
  const resolverName = report.resolution?.resolved_by.name;
  const who = resolverName ? ` por ${shortName(resolverName)}` : '';
  const title = `${archived ? 'Arquivada' : 'Resolvida'}${who}`;

  if (archived) return { title, text: 'Denúncia arquivada sem nenhuma ação na conta.' };

  switch (report.resolution?.action) {
    case 'BANNED':
      return { title, text: 'Ação aplicada: banimento permanente da conta.' };
    case 'SUSPENDED':
      return { title, text: 'Ação aplicada: suspensão temporária da conta.' };
    default:
      return { title, text: 'Denúncia encerrada.' };
  }
}
