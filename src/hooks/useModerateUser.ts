import { useCallback, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { ModerationAction, ModerationPayload, ModerationResult } from '@/types/admin';
import { apiFetch } from '@/utils/http';
import { isApiErrorLike } from '@/utils/apiErrors';

/** Duração da suspensão aplicada pela ficha, igual à do detalhe da denúncia (task 261). */
export const SUSPENSION_DAYS = 7;

export type ModerateResult =
  | { kind: 'done'; result: ModerationResult }
  /** `status` é o HTTP da falha (`null` sem resposta), para a tela reagir a 404 e 409. */
  | { kind: 'failed'; message: string; status: number | null };

/**
 * Aplica uma ação de moderação sobre um usuário
 * (`PATCH /admin/users/{user_id}/moderation`).
 *
 * Retorna `{ moderate, isLoading }`. `moderate` resolve sempre — `kind: 'done'`
 * em sucesso, `kind: 'failed'` com mensagem legível em erro.
 */
export function useModerateUser(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);

  const moderate = useCallback(async (
    action: ModerationAction,
  ): Promise<ModerateResult> => {
    if (inFlight.current) return { kind: 'failed', message: 'Ação em andamento', status: null };
    inFlight.current = true;
    setIsLoading(true);

    const payload: ModerationPayload =
      action === 'SUSPEND'
        ? { action: 'SUSPEND', duration_days: SUSPENSION_DAYS }
        : action === 'BAN'
          ? { action: 'BAN' }
          : { action: 'REVERT' };

    try {
      const result = await apiFetch<ModerationResult>(
        endpoints.adminUserModeration(userId),
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      return { kind: 'done', result };
    } catch (caught) {
      const status = isApiErrorLike(caught) ? caught.status : null;
      return { kind: 'failed', message: resolveErrorMessage(caught), status };
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [userId]);

  return { moderate, isLoading };
}

function resolveErrorMessage(error: unknown): string {
  if (!isApiErrorLike(error)) return 'Não foi possível concluir a ação. Tente de novo.';

  const { kind, status, detail } = error;
  if (kind === 'network') return 'Sem conexão com a internet';
  if (kind === 'timeout') return 'A conexão demorou demais';
  if (status === 404) return 'Usuário não encontrado';
  if (status === 409) {
    if (detail === 'Account is already banned') return 'Esta conta já está banida';
    if (detail === 'User is not banned or suspended') return 'Esta conta já está ativa';
    if (detail === 'Admins cannot moderate their own account') return 'Não é possível moderar a própria conta';
    return 'Ação inválida para o estado atual do usuário';
  }
  return 'Não foi possível concluir a ação. Tente de novo.';
}
