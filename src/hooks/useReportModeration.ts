import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import { SUSPENSION_DAYS } from '@/hooks/useModerateUser';
import type { ModerationPayload, ModerationResult, UserModerationStatus } from '@/types/admin';
import type { EventModerationPayload, EventModerationResult } from '@/types/adminReport';
import { describeActionError, isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export { SUSPENSION_DAYS };

export type ReportModerationAction = 'BAN' | 'SUSPEND' | 'ARCHIVE' | 'REMOVE_EVENT';

export type ReportModerationResult =
  /** Ação aplicada; `moderationStatus` é o novo status da conta (ausente ao arquivar). */
  | { status: 'done'; moderationStatus?: UserModerationStatus }
  /** A denúncia ou a conta mudou por fora: a tela deve recarregar o detalhe. */
  | { status: 'stale' }
  /** Recusada por regra que recarregar não muda (ex.: a própria conta). */
  | { status: 'rejected' }
  | { status: 'failed' }
  | { status: 'ignored' };

/**
 * `detail` dos 409 de `PATCH /admin/users/{id}/moderation` (task 249 [BE]) e de
 * `PATCH /admin/reports/{id}/archive` (task 246 [BE]) e de
 * `PATCH /admin/events/{id}/moderation`, em `routes/admin.py`.
 */
const REPORT_ALREADY_RESOLVED = 'Report already resolved';
const ACCOUNT_ALREADY_BANNED = 'Account is already banned';
const OWN_ACCOUNT = 'Admins cannot moderate their own account';
const REPORT_NOT_ABOUT_USER = 'Report is not about this user';
const EVENT_ALREADY_REMOVED = 'Event already removed';
/** O único 400 da remoção: a denúncia é de outro alvo. */
const REPORT_NOT_ABOUT_EVENT = 'Report does not belong to this event';

/** 409 que não mudam ao recarregar: só avisa, sem buscar de novo. */
const REJECTED_MESSAGE: Record<string, string> = {
  [OWN_ACCOUNT]: 'Não é possível moderar a própria conta.',
  [REPORT_NOT_ABOUT_USER]: 'Esta denúncia não é sobre esta conta.',
  [REPORT_NOT_ABOUT_EVENT]: 'Esta denúncia não é sobre este evento.',
};

function staleMessage(status: number, detail: string | null): string {
  if (detail === ACCOUNT_ALREADY_BANNED) return 'Esta conta já está banida.';
  if (detail === EVENT_ALREADY_REMOVED) return 'Este evento já foi removido.';
  if (detail === REPORT_ALREADY_RESOLVED) return 'Esta denúncia já foi encerrada por outra pessoa.';
  if (status === 409) return 'A denúncia ou a conta mudou. Confira o estado atual.';
  return 'Esta denúncia ou a conta não existe mais.';
}

/**
 * As ações do detalhe da denúncia. Banir e suspender agem sobre a conta
 * (`target.id`) e, com o `report_id`, resolvem a denúncia na mesma transação;
 * arquivar é outro endpoint e não toca na conta. Em denúncia de evento,
 * "Remover evento" tira o evento do ar e resolve a denúncia, sem mudar a conta
 * do organizador.
 */
export function useReportModeration() {
  const { addToast } = useToast();
  const [pendingAction, setPendingAction] = useState<ReportModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      action: ReportModerationAction,
      request: () => Promise<UserModerationStatus | undefined>,
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
        if (
          isApiErrorLike(caught) &&
          (caught.status === 409 || caught.status === 400) &&
          caught.detail &&
          REJECTED_MESSAGE[caught.detail]
        ) {
          const message = REJECTED_MESSAGE[caught.detail];
          setError(message);
          addToast({ type: 'warning', message });
          return { status: 'rejected' };
        }
        if (isApiErrorLike(caught) && (caught.status === 404 || caught.status === 409)) {
          const message = staleMessage(caught.status, caught.detail);
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
    async (userId: string, body: ModerationPayload) => {
      const updated = await apiFetch<ModerationResult>(endpoints.adminUserModeration(userId), {
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

  const removeEvent = useCallback(
    (eventId: string, reportId: string) =>
      run('REMOVE_EVENT', async () => {
        const body: EventModerationPayload = { action: 'REMOVE', report_id: reportId };
        await apiFetch<EventModerationResult>(endpoints.adminEventModeration(eventId), {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        // A conta do organizador não muda.
        return undefined;
      }),
    [run],
  );

  return { ban, suspend, archive, removeEvent, pendingAction, isLoading: pendingAction !== null, error };
}
