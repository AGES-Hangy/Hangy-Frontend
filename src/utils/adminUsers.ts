import type { AdminUserRowProps, ModerationStatus } from '@/components/AdminUserRow/types';
import type { AdminUser, UserModerationStatus } from '@/types/admin';
import { formatDayMonth } from '@/utils/datetime';

/** Abas da lista. `ALL` não filtra. */
export type AdminUsersStatusFilter = 'ALL' | 'SUSPENDED' | 'BANNED';

/** `max_length` de `search` no backend: acima disso, a API responde 422. */
export const ADMIN_USERS_SEARCH_MAX_LENGTH = 100;

export const UNNAMED_ADMIN_USER = 'Conta sem nome';

export type AdminUsersQueryInput = {
  search: string;
  filter: AdminUsersStatusFilter;
  cursor?: string | null;
};

export type AdminUsersPageSummary = {
  count: number;
  hasMore: boolean;
};

export function adminUsersStatusOf(filter: AdminUsersStatusFilter): UserModerationStatus | null {
  return filter === 'ALL' ? null : filter;
}

export function adminUsersQuery({ search, filter, cursor }: AdminUsersQueryInput): string {
  const params = new URLSearchParams();
  const moderationStatus = adminUsersStatusOf(filter);
  const term = search.trim().slice(0, ADMIN_USERS_SEARCH_MAX_LENGTH);

  if (moderationStatus) params.set('status', moderationStatus);
  if (term) params.set('search', term);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

function reportsSummary(count: number): string {
  if (count === 0) return 'Nenhuma denúncia';
  return `${count} ${count === 1 ? 'denúncia' : 'denúncias'}`;
}

export function adminUserRowProps(user: AdminUser): AdminUserRowProps {
  // Um status novo da API que o AdminUserRow não conheça quebra aqui no typecheck.
  const moderationStatus: ModerationStatus = user.moderation_status;
  const name = user.name?.trim() || UNNAMED_ADMIN_USER;
  const reportCount = user.report_count;

  if (moderationStatus === 'ACTIVE') {
    return { name, moderationStatus, eventCount: user.event_count, reportCount };
  }

  if (moderationStatus === 'SUSPENDED') {
    const untilDate = user.suspended_until ? formatDayMonth(user.suspended_until) : '';
    return {
      name,
      moderationStatus,
      untilDate,
      reportCount,
      summary: untilDate ? undefined : reportsSummary(reportCount),
    };
  }

  // A API não devolve `banned_at`: o `summary` substitui o texto que usaria a data.
  return { name, moderationStatus, untilDate: '', reportCount, summary: reportsSummary(reportCount) };
}

/** `N` é o tamanho da página recebida: com mais páginas, o total real não é conhecido. */
export function adminUsersAnnouncement({ count, hasMore }: AdminUsersPageSummary): string {
  if (count === 0) return 'Nenhuma conta encontrada';
  const accounts = `${count} ${count === 1 ? 'conta' : 'contas'}`;
  return hasMore ? `Mais de ${accounts}` : accounts;
}
