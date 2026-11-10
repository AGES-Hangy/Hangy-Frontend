import { useCallback, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { ModerationAction, ModerationPayload, ModerationResult } from '@/types/admin';
import { apiFetch } from '@/utils/http';
import { isApiErrorLike } from '@/utils/apiErrors';

export type ModerateResult =
  | { kind: 'done'; result: ModerationResult }
  | { kind: 'failed'; message: string };

/**
 * Aplica uma ação de moderação sobre um usuário
 * (`POST /admin/users/{user_id}/moderation`).
 *
 * Retorna `{ moderate, isLoading }`. `moderate` resolve sempre — `kind: 'done'`
 * em sucesso, `kind: 'failed'` com mensagem legível em erro.
 */
export function useModerateUser(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);

  const moderate = useCallback(async (
    action: ModerationAction,
    suspendedUntil?: string,
  ): Promise<ModerateResult> => {
    if (inFlight.current) return { kind: 'failed', message: 'Ação em andamento' };
    inFlight.current = true;
    setIsLoading(true);

    const payload: ModerationPayload = { action };
    if (action === 'SUSPEND' && suspendedUntil) {
      payload.suspended_until = suspendedUntil;
    }

    try {
      const result = await apiFetch<ModerationResult>(
        endpoints.adminUserModeration(userId),
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      return { kind: 'done', result };
    } catch (caught) {
      const message = resolveErrorMessage(caught);
      return { kind: 'failed', message };
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [userId]);

  return { moderate, isLoading };
}

function resolveErrorMessage(error: unknown): string {
  if (!isApiErrorLike(error)) return 'Não foi possível concluir a ação. Tente de novo.';

  const { kind, status } = error;
  if (kind === 'network') return 'Sem conexão com a internet';
  if (kind === 'timeout') return 'A conexão demorou demais';
  if (status === 409) return 'Ação inválida para o estado atual do usuário';
  if (status === 404) return 'Usuário não encontrado';
  return 'Não foi possível concluir a ação. Tente de novo.';
}
