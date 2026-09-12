import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { EventParticipant, ParticipantsResponse } from '@/types/event';
import { apiFetch } from '@/utils/http';
import { describeActionError, describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

/**
 * Participantes de um evento e as ações do organizador sobre eles —
 * `GET /events/{event_id}/participants` (task 097) e
 * `PATCH /events/{event_id}/participants/{participant_id}` (task 099).
 *
 * Aprovar, recusar e remover são **otimistas**: a lista muda na hora e volta
 * atrás se a API recusar. É o que faz a tela responder no toque em vez de
 * esperar a rede — e o motivo de o spinner ser por card (`isProcessing`) e não
 * na tela inteira: aprovar um pendente não pode congelar a lista.
 *
 * Os contadores saem do próprio estado local depois de uma ação, sem novo
 * `GET`, como a task pede.
 */

/** Instantâneo das listas, para desfazer uma ação otimista que falhou. */
interface Snapshot {
  confirmed: EventParticipant[];
  pending: EventParticipant[];
}

export function useEventParticipants(eventId: string | undefined) {
  const { addToast } = useToast();

  const [confirmed, setConfirmed] = useState<EventParticipant[]>([]);
  const [pending, setPending] = useState<EventParticipant[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  /** Ids com um `PATCH` em voo — cada card olha o seu. */
  const [processing, setProcessing] = useState<ReadonlySet<string>>(new Set());
  /** `409 Event is full`: aprovar fica desabilitado em todos os pendentes. */
  const [isFull, setIsFull] = useState(false);
  /** Evento encerrado ou sem permissão: a tela vira somente leitura. */
  const [isReadOnly, setIsReadOnly] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ParticipantsResponse>(endpoints.eventParticipants(eventId));
      setConfirmed(data.confirmed);
      setPending(data.pending);
      setCanManage(data.can_manage);
    } catch (caught) {
      // 403 ao listar pendentes não é erro de tela: é "você só pode ver os
      // confirmados". A seção some e o resto continua.
      const load403 =
        typeof caught === 'object' && caught !== null && (caught as { status?: number }).status === 403;

      if (load403) {
        setCanManage(false);
        setPending([]);
      } else {
        setError(describeLoadError(caught));
      }
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const markProcessing = useCallback((participantId: string, active: boolean) => {
    setProcessing((current) => {
      const next = new Set(current);
      if (active) next.add(participantId);
      else next.delete(participantId);
      return next;
    });
  }, []);

  /**
   * Aplica a mudança local, dispara o `PATCH` e desfaz se ele falhar. Todas as
   * três ações passam por aqui — o que muda é o `status` enviado, o efeito
   * otimista e a mensagem de sucesso.
   */
  const mutate = useCallback(
    async (
      participant: EventParticipant,
      status: EventParticipant['status'],
      applyOptimistic: (snapshot: Snapshot) => Snapshot,
      successMessage: string | null,
    ) => {
      if (!eventId) return;

      const snapshot: Snapshot = { confirmed, pending };
      const optimistic = applyOptimistic(snapshot);

      setConfirmed(optimistic.confirmed);
      setPending(optimistic.pending);
      markProcessing(participant.participant_id, true);

      try {
        await apiFetch(endpoints.eventParticipant(eventId, participant.participant_id), {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        if (successMessage) addToast({ type: 'success', message: successMessage });
      } catch (caught) {
        // Rollback: a API recusou, então a lista volta ao que era.
        setConfirmed(snapshot.confirmed);
        setPending(snapshot.pending);

        const failure = describeActionError(caught);
        if (failure.message) addToast({ type: failure.tone, message: failure.message });
        if (failure.full) setIsFull(true);
        if (failure.readOnly) setIsReadOnly(true);
        if (failure.shouldReload) load();
      } finally {
        markProcessing(participant.participant_id, false);
      }
    },
    [addToast, confirmed, eventId, load, markProcessing, pending],
  );

  const approve = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'CONFIRMED',
        (snapshot) => ({
          pending: snapshot.pending.filter(
            (p) => p.participant_id !== participant.participant_id,
          ),
          confirmed: [...snapshot.confirmed, { ...participant, status: 'CONFIRMED' }],
        }),
        `${participant.name} entrou na lista de participantes.`,
      ),
    [mutate],
  );

  const reject = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'REJECTED',
        (snapshot) => ({
          confirmed: snapshot.confirmed,
          pending: snapshot.pending.filter(
            (p) => p.participant_id !== participant.participant_id,
          ),
        }),
        `Solicitação de ${participant.name} recusada.`,
      ),
    [mutate],
  );

  const remove = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'REMOVED',
        (snapshot) => ({
          pending: snapshot.pending,
          confirmed: snapshot.confirmed.filter(
            (p) => p.participant_id !== participant.participant_id,
          ),
        }),
        `${participant.name} saiu da lista de participantes.`,
      ),
    [mutate],
  );

  return {
    confirmed,
    pending,
    /** Contadores locais: já refletem a última ação, sem novo `GET`. */
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    /** `false` quando a API nega os pendentes — a seção nem é renderizada. */
    canManage,
    isLoading,
    error,
    isFull,
    isReadOnly,
    isProcessing: (participantId: string) => processing.has(participantId),
    approve,
    reject,
    remove,
    reload: load,
  };
}
