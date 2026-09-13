import { useCallback, useEffect, useRef, useState } from 'react';

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

/** Restaura só a pessoa da mutação que falhou, preservando outras ações. */
function restoreAt(list: EventParticipant[], person: EventParticipant, index: number) {
  if (list.some((item) => item.participant_id === person.participant_id)) return list;
  const next = [...list];
  next.splice(Math.min(index, next.length), 0, person);
  return next;
}

export function useEventParticipants(eventId: string | undefined) {
  const { addToast } = useToast();

  const [confirmed, setConfirmed] = useState<EventParticipant[]>([]);
  const [pending, setPending] = useState<EventParticipant[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedEventId, setLoadedEventId] = useState<string>();
  const [error, setError] = useState<LoadError | null>(null);

  /** Ids com um `PATCH` em voo — cada card olha o seu. */
  const [processing, setProcessing] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  /** `409 Event is full`: aprovar fica desabilitado em todos os pendentes. */
  const [isFull, setIsFull] = useState(false);
  /** Evento encerrado ou sem permissão: a tela vira somente leitura. */
  const [isReadOnly, setIsReadOnly] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoadedEventId(undefined);
      setConfirmed([]);
      setPending([]);
      setConfirmedCount(0);
      setPendingCount(0);
      setCanManage(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ParticipantsResponse>(endpoints.eventParticipants(eventId));
      setConfirmed(data.confirmed);
      setPending(data.pending);
      setConfirmedCount(data.confirmed_count);
      setPendingCount(data.pending_count);
      setCanManage(data.can_manage);
    } catch (caught) {
      // Um 403 no GET inteiro não traz confirmados para exibir. Não manter
      // uma lista antiga nem fingir que o evento está vazio.
      const load403 =
        typeof caught === 'object' && caught !== null && (caught as { status?: number }).status === 403;

      if (load403) {
        // Sem resposta não há lista de confirmados confiável para manter.
        setConfirmed([]);
        setCanManage(false);
        setPending([]);
        setConfirmedCount(0);
        setPendingCount(0);
        setError({
          kind: 'unavailable',
          title: 'Participantes indisponíveis',
          message: 'Você não pode ver os participantes deste evento.',
          canRetry: false,
        });
      } else {
        setError(describeLoadError(caught));
      }
    } finally {
      setLoadedEventId(eventId);
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
      successMessage: string | null,
    ) => {
      const participantId = participant.participant_id;
      if (!eventId || !canManage || isReadOnly || inFlight.current.has(participantId)) return;

      inFlight.current.add(participantId);
      const wasPending = status !== 'REMOVED';
      const originalIndex = (wasPending ? pending : confirmed).findIndex(
        (p) => p.participant_id === participantId,
      );
      if (originalIndex < 0) {
        inFlight.current.delete(participantId);
        return;
      }

      if (wasPending) {
        setPending((current) => current.filter((p) => p.participant_id !== participantId));
        setPendingCount((current) => current - 1);
      } else {
        setConfirmed((current) => current.filter((p) => p.participant_id !== participantId));
        setConfirmedCount((current) => current - 1);
      }
      if (status === 'CONFIRMED') {
        setConfirmed((current) => [...current, { ...participant, status }]);
        setConfirmedCount((current) => current + 1);
      }
      markProcessing(participantId, true);

      try {
        await apiFetch(endpoints.eventParticipant(eventId, participant.participant_id), {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        if (successMessage) addToast({ type: 'success', message: successMessage });
      } catch (caught) {
        // Reverte apenas esta pessoa: restaurar um snapshot completo apagaria
        // o sucesso de outra ação que terminou enquanto esta estava em voo.
        if (status === 'CONFIRMED') {
          setConfirmed((current) => current.filter((p) => p.participant_id !== participantId));
          setConfirmedCount((current) => current - 1);
        }
        if (wasPending) {
          setPending((current) => restoreAt(current, participant, originalIndex));
          setPendingCount((current) => current + 1);
        } else {
          setConfirmed((current) => restoreAt(current, participant, originalIndex));
          setConfirmedCount((current) => current + 1);
        }

        const failure = describeActionError(caught);
        if (failure.message) addToast({ type: failure.tone, message: failure.message });
        if (failure.full) setIsFull(true);
        if (failure.readOnly) setIsReadOnly(true);
        if (failure.shouldReload) load();
      } finally {
        inFlight.current.delete(participantId);
        markProcessing(participantId, false);
      }
    },
    [addToast, canManage, confirmed, eventId, isReadOnly, load, markProcessing, pending],
  );

  const approve = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'CONFIRMED',
        `${participant.name} entrou na lista de participantes.`,
      ),
    [mutate],
  );

  const reject = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'REJECTED',
        `Solicitação de ${participant.name} recusada.`,
      ),
    [mutate],
  );

  const remove = useCallback(
    (participant: EventParticipant) =>
      mutate(
        participant,
        'REMOVED',
        `${participant.name} saiu da lista de participantes.`,
      ),
    [mutate],
  );

  return {
    confirmed,
    pending,
    /** Contadores da resposta, ajustados nas mutações sem novo `GET`. */
    confirmedCount,
    pendingCount,
    /** `false` para uma lista visível sem permissão de gestão. */
    canManage,
    isLoading: isLoading || Boolean(eventId && loadedEventId !== eventId),
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
