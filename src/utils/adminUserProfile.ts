import type { AdminUserProfile, ModerationHistoryEntry } from '@/types/admin';

/** Nome exibido na ficha; a conta pode ter ficado sem nome. */
export function adminUserName(profile: Pick<AdminUserProfile, 'name'>): string {
  return profile.name?.trim() || 'Conta sem nome';
}

/**
 * `2025-03-14` → `03/2025`. A data vem sem hora: ler pelas partes evita que o
 * fuso volte um dia e mude o mês no dia 1º.
 */
export function memberSinceLabel(memberSince: string): string {
  const [year, month] = memberSince.split('-');
  return year && month ? `${month}/${year}` : '';
}

const HISTORY_ACTION_LABEL: Record<string, string> = {
  BANNED: 'Banido permanentemente',
  SUSPENDED: 'Suspenso',
  REVERTED: 'Moderação revertida',
};

/** Texto de uma linha do histórico, sem a data. */
export function moderationEntryText(entry: Pick<ModerationHistoryEntry, 'action'>): string {
  return HISTORY_ACTION_LABEL[entry.action] ?? 'Ação de moderação';
}

/** Linha de apoio de um StatCard: `undefined` com zero, para o card não mostrar "0 cancelados". */
export function countSupport(count: number, singular: string, plural: string): string | undefined {
  if (count <= 0) return undefined;
  return `${count} ${count === 1 ? singular : plural}`;
}
