import type { ReportStatus } from '@/types/admin';
import type { AdminReportQueueItem } from '@/types/adminReport';
import { reportSubtitle, reportTargetName, reportTargetOf } from '@/utils/adminDashboard';
import { reportReasonLabel, shortName } from '@/utils/adminReport';
import { formatRelativeTime } from '@/utils/datetime';

/**
 * Abas do frame. Arquivadas (`REJECTED`) ficam fora: o frame tem só estas três
 * e a API aceita um `status` por vez, então juntá-las em "Resolvidas" exigiria
 * intercalar duas paginações.
 */
export const REPORT_QUEUE_TABS = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'REVIEWED', label: 'Em análise' },
  { value: 'RESOLVED', label: 'Resolvidas' },
] as const satisfies readonly { value: ReportStatus; label: string }[];

export type ReportQueueTab = (typeof REPORT_QUEUE_TABS)[number]['value'];

/** `max_length` de `search` no backend: acima disto a API responde `422`. */
export const REPORT_QUEUE_SEARCH_MAX_LENGTH = 100;

export function reportQueueCard(item: AdminReportQueueItem) {
  return {
    target: reportTargetOf(item.target_type),
    targetName: reportTargetName(item.target_type, item.target_name),
    // A API da fila não manda foto nem capa: o card mostra o ícone.
    targetImageUrl: null,
    subtitle: reportQueueSubtitle(item),
    moderationStatus: item.status,
    reason: reportReasonLabel(item.reason),
    descriptionExcerpt: item.description_excerpt,
    reportNumber: item.report_number,
  };
}

/**
 * Linha de apoio do card. Evento mostra quem organiza, como no frame
 * ("Organizado por Marina S. · há 5 h"); conta mostra quantas denúncias.
 */
export function reportQueueSubtitle(item: AdminReportQueueItem): string {
  const organizer = item.target_type === 'EVENT' ? item.organizer_name?.trim() : null;
  if (!organizer) return reportSubtitle(item.report_count, item.opened_at);
  const when = formatRelativeTime(item.opened_at);
  const who = `Organizado por ${shortName(organizer)}`;
  return when ? `${who} · ${when}` : who;
}

/**
 * Nome do alvo filtrado, para o chip: a rota só traz o id. O backend devolve só
 * denúncias contra o próprio alvo (as dos eventos de uma conta ficam de fora);
 * o tipo é conferido para o chip nunca mostrar o nome de outro alvo.
 */
export function reportQueueTargetName(items: AdminReportQueueItem[], isEventTarget: boolean): string | null {
  const match = items.find((item) =>
    isEventTarget ? item.target_type === 'EVENT' : item.target_type === 'USER' || item.target_type === 'BUSINESS',
  );
  return match?.target_name?.trim() || null;
}

/** Texto do chip; `null` sem filtro. Sem nome (nada carregado na aba), cai no genérico. */
export function reportQueueTargetLabel({
  targetName,
  targetUserId,
  targetEventId,
}: {
  targetName: string | null;
  targetUserId: string | null;
  targetEventId: string | null;
}): string | null {
  if (!targetUserId && !targetEventId) return null;
  if (targetName) return `Denúncias de ${targetName}`;
  return targetEventId ? 'Denúncias deste evento' : 'Denúncias deste usuário';
}

/** Título da task para o que não tem frame; "Pendentes" segue o frame da fila vazia. */
const EMPTY_TITLE = 'Nenhuma denúncia por aqui';

const EMPTY_TAB_COPY: Record<ReportQueueTab, { title: string; text: string }> = {
  PENDING: {
    title: 'Nenhuma denúncia pendente',
    text: 'Tudo em dia. Novas denúncias aparecem aqui assim que chegam.',
  },
  REVIEWED: {
    title: EMPTY_TITLE,
    text: 'As denúncias em análise aparecem aqui.',
  },
  RESOLVED: {
    title: EMPTY_TITLE,
    text: 'As denúncias encerradas com ação aparecem aqui.',
  },
};

export function reportQueueEmptyCopy({
  tab,
  search,
  isTargeted,
}: {
  tab: ReportQueueTab;
  search: string;
  isTargeted: boolean;
}): { title: string; text: string } {
  if (search) {
    return { title: 'Nenhuma denúncia encontrada', text: `Nada nesta aba para "${search}".` };
  }
  if (isTargeted) {
    return { title: EMPTY_TITLE, text: 'Não há denúncias deste alvo nesta aba.' };
  }
  return EMPTY_TAB_COPY[tab];
}
