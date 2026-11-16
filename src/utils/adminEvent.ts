import type { AdminEventDetail } from '@/types/adminEvent';
import { formatDateTime, formatDayMonth, formatTime } from '@/utils/datetime';

/** `25/11/2026 · 17:49 – 20:49`: o fim só com a hora quando cai no mesmo dia. */
export function adminEventWhen(event: Pick<AdminEventDetail, 'event_date' | 'end_date'>): string {
  const start = formatDateTime(event.event_date);
  if (!start) return '';
  const sameDay = formatDayMonth(event.event_date) === formatDayMonth(event.end_date);
  const end = sameDay ? formatTime(event.end_date) : formatDateTime(event.end_date);
  return end ? `${start} – ${end}` : start;
}

/** `Apartamento do João · Santana, Porto Alegre`, sem partes vazias. */
export function adminEventPlace(
  event: Pick<AdminEventDetail, 'location_name' | 'location_neighborhood' | 'location_city'>,
): string {
  const area = [event.location_neighborhood, event.location_city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  return [event.location_name?.trim(), area].filter(Boolean).join(' · ');
}

/**
 * Aviso de estado acima das métricas; `null` com o evento no ar. A remoção por
 * moderação vence o status do organizador (um evento removido some do app).
 */
export function adminEventStateNotice(
  event: Pick<AdminEventDetail, 'moderation_status' | 'removed_at' | 'status'>,
): { tone: 'error' | 'neutral'; text: string } | null {
  if (event.moderation_status === 'REMOVED') {
    const on = event.removed_at ? formatDayMonth(event.removed_at) : '';
    return { tone: 'error', text: on ? `Removido pela moderação em ${on}` : 'Removido pela moderação' };
  }
  if (event.status === 'CANCELLED') return { tone: 'neutral', text: 'Cancelado pelo organizador' };
  if (event.status === 'FINISHED') return { tone: 'neutral', text: 'Evento encerrado' };
  return null;
}
