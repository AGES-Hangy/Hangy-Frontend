import type { AdminUserRowProps, ModerationStatus } from '@/components/AdminUserRow/types';
import type { AdminUser, UserModerationStatus } from '@/types/admin';
import { formatDayMonth } from '@/utils/datetime';

/** Abas da lista. `ALL` não filtra. */
export type AdminUsersStatusFilter = 'ALL' | 'SUSPENDED' | 'BANNED';

/** `max_length` de `search` no backend: acima disso, a API responde 422. */
export const ADMIN_USERS_SEARCH_MAX_LENGTH = 100;

/** `MAX_ADMIN_USERS_LIMIT` do backend: acima disso, a API responde 400. */
export const ADMIN_USERS_PAGE_MAX = 100;

export const UNNAMED_ADMIN_USER = 'Conta sem nome';

export type AdminUsersQueryInput = {
  search: string;
  filter: AdminUsersStatusFilter;
  cursor?: string | null;
  /** Só ao recarregar a parte já carregada; sem ele, vale a página padrão do backend. */
  limit?: number;
};

export type AdminUsersPageSummary = {
  count: number;
  hasMore: boolean;
};

export function adminUsersStatusOf(filter: AdminUsersStatusFilter): UserModerationStatus | null {
  return filter === 'ALL' ? null : filter;
}

export function adminUsersQuery({ search, filter, cursor, limit }: AdminUsersQueryInput): string {
  const params = new URLSearchParams();
  const moderationStatus = adminUsersStatusOf(filter);
  const term = search.trim().slice(0, ADMIN_USERS_SEARCH_MAX_LENGTH);

  if (moderationStatus) params.set('status', moderationStatus);
  if (term) params.set('search', term);
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));
  return params.toString();
}

/** Quantas contas pedir para recarregar a lista que está na tela; `undefined` sem lista. */
export function adminUsersReloadLimit(loadedCount: number): number | undefined {
  if (loadedCount <= 0) return undefined;
  return Math.min(loadedCount, ADMIN_USERS_PAGE_MAX);
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
