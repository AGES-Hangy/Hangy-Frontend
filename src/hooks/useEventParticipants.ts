import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { EventParticipantItem, ParticipantsPage, ParticipationStatus } from '@/types/event';
import { apiFetch } from '@/utils/http';
import { describeActionError, describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

/**
 * Participantes de um evento e as ações do organizador sobre eles —
 * `GET /events/{event_id}/participants` (task 097) e
 * `PATCH /events/{event_id}/participants/{participant_id}` (task 099).
 *
 * A API não devolve confirmados e pendentes numa resposta só: sem `status` ela
 * traz os confirmados, e só o organizador pode pedir `status=PENDING` — por
 * isso são duas chamadas, a segunda só quando `isOrganizer` é `true`. Também
 * não existe um `can_manage` na resposta: quem decide isso é o papel do
 * viewer no detalhe do evento, que a tela já tem e passa como `isOrganizer`.
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
function restoreAt(list: EventParticipantItem[], person: EventParticipantItem, index: number) {
  if (list.some((item) => item.participant_id === person.participant_id)) return list;
  const next = [...list];
  next.splice(Math.min(index, next.length), 0, person);
  return next;
}

export function useEventParticipants(eventId: string | undefined, isOrganizer: boolean) {
  const { addToast } = useToast();

  const [confirmed, setConfirmed] = useState<EventParticipantItem[]>([]);
  const [pending, setPending] = useState<EventParticipantItem[]>([]);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  /** `false` quando o `GET` de pendentes nega: a seção some em vez de mostrar e negar. */
  const [pendingVisible, setPendingVisible] = useState(false);
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
      setPendingVisible(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const confirmedPage = await apiFetch<ParticipantsPage>(endpoints.eventParticipants(eventId));
      setConfirmed(confirmedPage.items);
      setConfirmedCount(confirmedPage.counts.CONFIRMED ?? confirmedPage.items.length);

      if (isOrganizer) {
        try {
          const pendingPage = await apiFetch<ParticipantsPage>(
            endpoints.eventParticipants(eventId, 'PENDING'),
          );
          setPending(pendingPage.items);
          setPendingCount(pendingPage.counts.PENDING ?? pendingPage.items.length);
          setPendingVisible(true);
        } catch {
          // O papel de organizador pode ter mudado entre telas: um 403 aqui
          // não invalida os confirmados que já carregaram, só esconde a seção.
          setPending([]);
          setPendingCount(0);
          setPendingVisible(false);
        }
      } else {
        setPending([]);
        setPendingCount(0);
        setPendingVisible(false);
      }
    } catch (caught) {
      // Um 403 no GET dos confirmados não traz lista para exibir. Não manter
      // uma lista antiga nem fingir que o evento está vazio.
      const load403 =
        typeof caught === 'object' && caught !== null && (caught as { status?: number }).status === 403;

      if (load403) {
        setConfirmed([]);
        setPending([]);
        setConfirmedCount(0);
        setPendingCount(0);
        setPendingVisible(false);
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
  }, [eventId, isOrganizer]);

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
      participant: EventParticipantItem,
      status: ParticipationStatus,
      successMessage: string | null,
    ) => {
      const participantId = participant.participant_id;
      if (!eventId || !isOrganizer || isReadOnly || inFlight.current.has(participantId)) return;

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
    [addToast, confirmed, eventId, isOrganizer, isReadOnly, load, markProcessing, pending],
  );

  const approve = useCallback(
    (participant: EventParticipantItem) =>
      mutate(
        participant,
        'CONFIRMED',
        `${participant.user.name ?? 'Usuário'} entrou na lista de participantes.`,
      ),
    [mutate],
  );

  const reject = useCallback(
    (participant: EventParticipantItem) =>
      mutate(
        participant,
        'REJECTED',
        `Solicitação de ${participant.user.name ?? 'Usuário'} recusada.`,
      ),
    [mutate],
  );

  const remove = useCallback(
    (participant: EventParticipantItem) =>
      mutate(
        participant,
        'REMOVED',
        `${participant.user.name ?? 'Usuário'} saiu da lista de participantes.`,
      ),
    [mutate],
  );

  return {
    confirmed,
    pending,
    /** Contadores da resposta, ajustados nas mutações sem novo `GET`. */
    confirmedCount,
    pendingCount,
    /** `false` para pendentes não carregados (sem permissão, ou nem pedidos). */
    pendingVisible,
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
