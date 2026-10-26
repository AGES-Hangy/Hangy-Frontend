import type { UserRole } from '@/types/profile';

/** Primeira tela autenticada de cada papel: o painel para admin, a Home para os demais. */
export function homeRouteFor(role: UserRole) {
  return role === 'ADMIN' ? ('/Admin/Painel' as const) : ('/Home' as const);
}
