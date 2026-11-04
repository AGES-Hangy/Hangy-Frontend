import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type {
  AdminUserModerationInput,
  AdminUserModerationOutput,
  ModerationStatus,
} from '@/types/adminReport';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/**
 * Duração fixa do "Suspender 7 dias". O endpoint aceita outros valores, mas o
 * produto ainda não pediu um seletor de duração.
 */
export const SUSPENSION_DAYS = 7;

export type ReportModerationAction = 'BAN' | 'SUSPEND' | 'ARCHIVE';

export type ReportModerationResult =
  /** Ação aplicada; `moderationStatus` é o novo status da conta (ausente ao arquivar). */
  | { status: 'done'; moderationStatus?: ModerationStatus }
  /** A denúncia ou a conta mudou por fora: a tela deve recarregar o detalhe. */
  | { status: 'stale' }
  | { status: 'failed' }
  | { status: 'ignored' };

/** `detail` dos 409 de `PATCH /admin/users/{id}/moderation` (task 249 [BE]). */
const REPORT_NOT_OPEN = 'Report is no longer open';
const ACCOUNT_ALREADY_BANNED = 'Account is already banned';

function staleMessage(detail: string | null): string {
  if (detail === ACCOUNT_ALREADY_BANNED) return 'Esta conta já está banida.';
  if (detail === REPORT_NOT_OPEN) return 'Esta denúncia já foi encerrada por outra pessoa.';
  return 'Esta denúncia ou a conta não existe mais.';
}

/**
 * As três ações do detalhe da denúncia. Banir e suspender agem sobre a conta
 * (`target.id`) e, com o `report_id`, resolvem a denúncia na mesma transação;
 * arquivar é outro endpoint e não toca na conta.
 */
export function useReportModeration() {
  const { addToast } = useToast();
  const [pendingAction, setPendingAction] = useState<ReportModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      action: ReportModerationAction,
      request: () => Promise<ModerationStatus | undefined>,
    ): Promise<ReportModerationResult> => {
      if (inFlight.current) return { status: 'ignored' };
      inFlight.current = true;
      setPendingAction(action);
      setError(null);

      try {
        const moderationStatus = await request();
        return { status: 'done', moderationStatus };
      } catch (caught) {
        // O `apiFetch` já avisa a sessão expirada (ou o papel que mudou) e volta para o Login.
        if (isApiErrorLike(caught) && (caught.status === 401 || caught.status === 403)) {
          return { status: 'failed' };
        }
        if (isApiErrorLike(caught) && (caught.status === 404 || caught.status === 409)) {
          const message = staleMessage(caught.detail);
          setError(message);
          addToast({ type: 'warning', message });
          return { status: 'stale' };
        }

        const failure = describeActionError(caught);
        setError(failure.message);
        addToast({ type: failure.tone, message: failure.message });
        return { status: 'failed' };
      } finally {
        inFlight.current = false;
        setPendingAction(null);
      }
    },
    [addToast],
  );

  const moderate = useCallback(
    async (userId: string, body: AdminUserModerationInput) => {
      const updated = await apiFetch<AdminUserModerationOutput>(endpoints.adminUserModeration(userId), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return updated.moderation_status;
    },
    [],
  );

  const ban = useCallback(
    (userId: string, reportId: string) =>
      run('BAN', () => moderate(userId, { action: 'BAN', report_id: reportId })),
    [moderate, run],
  );

  const suspend = useCallback(
    (userId: string, reportId: string) =>
      run('SUSPEND', () =>
        moderate(userId, { action: 'SUSPEND', duration_days: SUSPENSION_DAYS, report_id: reportId }),
      ),
    [moderate, run],
  );

  const archive = useCallback(
    (reportId: string) =>
      run('ARCHIVE', async () => {
        await apiFetch<unknown>(endpoints.adminReportArchive(reportId), { method: 'PATCH' });
        return undefined;
      }),
    [run],
  );

  return { ban, suspend, archive, pendingAction, isLoading: pendingAction !== null, error };
}
