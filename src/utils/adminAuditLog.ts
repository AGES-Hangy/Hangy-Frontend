import type { AuditLogItem } from '@/types/admin';
import { formatDate } from '@/utils/datetime';

export type AuditLogSection = {
  /** Dia local no formato `AAAA-MM-DD`, ou `''` para data inválida. */
  key: string;
  /** "HOJE", "ONTEM" ou `30/10/2026` — já em caixa alta, como pede o SectionHeader Overline. */
  title: string;
  data: AuditLogItem[];
};

const pad = (value: number) => String(value).padStart(2, '0');

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeOf(iso: string): number {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/** Fica por último: o backend sempre manda `created_at`, então é só defesa. */
const UNKNOWN_DAY_TITLE = 'DATA DESCONHECIDA';

/**
 * Agrupa os registros por dia local, do mais recente para o mais antigo. O
 * backend já ordena; reordenar de novo garante a ordem dentro dos grupos
 * mesmo se o fuso trocar o dia de um registro na virada.
 */
export function groupAuditLog(items: AuditLogItem[], now: Date = new Date()): AuditLogSection[] {
  const today = dayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);

  const sorted = [...items].sort((a, b) => timeOf(b.created_at) - timeOf(a.created_at));
  const sections: AuditLogSection[] = [];

  for (const item of sorted) {
    const date = new Date(item.created_at);
    const key = Number.isNaN(date.getTime()) ? '' : dayKey(date);
    let section = sections[sections.length - 1];

    if (!section || section.key !== key) {
      const title =
        key === '' ? UNKNOWN_DAY_TITLE
          : key === today ? 'HOJE'
            : key === yesterday ? 'ONTEM'
              : formatDate(item.created_at);
      section = { key, title, data: [] };
      sections.push(section);
    }
    section.data.push(item);
  }

  return sections;
}
