import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { EventParticipantItem, ParticipantsPage } from '@/types/event';
import type { Notification, NotificationsPage, UnreadNotificationCount } from '@/types/notification';
import { ApiError, apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  errorKind: 'offline' | 'timeout' | 'server' | 'invalid' | null;
  errorScope: 'notifications' | 'pagination' | null;
  canRetryError: boolean;
  hasMore: boolean;
  loadNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  respondToParticipationRequest: (id: string, status: 'CONFIRMED' | 'REJECTED') => Promise<void>;
  processingIds: ReadonlySet<string>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const PAGE_SIZE = 100;

function describeNotificationsLoadError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return { kind: 'offline' as const, message: 'Sem conexão com a internet', canRetry: false };
    }
    if (error.kind === 'timeout') {
      return { kind: 'timeout' as const, message: 'A conexão demorou demais', canRetry: true };
    }
    if (error.status === 400) {
      console.error('[notifications] parâmetros inválidos:', error.detail);
      return { kind: 'invalid' as const, message: 'Não foi possível carregar. Tente de novo.', canRetry: false };
    }
  }
  return { kind: 'server' as const, message: 'Não foi possível carregar. Tente de novo.', canRetry: true };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<NotificationsContextValue['errorKind']>(null);
  const [errorScope, setErrorScope] = useState<'notifications' | 'pagination' | null>(null);
  const [canRetryError, setCanRetryError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<ReadonlySet<string>>(new Set());
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await apiFetch<UnreadNotificationCount>(endpoints.notificationsUnreadCount());
      setUnreadCount(response.unread_count);
    } catch {
      // A tela ainda pode carregar a contagem da resposta de GET /notifications.
      // Falha no contador não substitui a lista nem a contagem já carregadas.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    setErrorKind(null);
    setErrorScope(null);
    setCanRetryError(false);

    try {
      const page = await apiFetch<NotificationsPage>(endpoints.notifications({ limit: PAGE_SIZE }));
      setNotifications(page.items);
      setUnreadCount(page.unread_count);
      cursorRef.current = page.next_cursor;
      setNextCursor(page.next_cursor);
    } catch (caught) {
      const failure = describeNotificationsLoadError(caught);
      if (failure.kind === 'invalid') {
        cursorRef.current = null;
        setNextCursor(null);
      }
      setError(failure.message);
      setErrorKind(failure.kind);
      setErrorScope('notifications');
      setCanRetryError(failure.canRetry);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setError(null);
    setErrorKind(null);
    setErrorScope(null);
    setCanRetryError(false);

    try {
      const page = await apiFetch<NotificationsPage>(endpoints.notifications({ limit: PAGE_SIZE, cursor }));
      setNotifications((current) => {
        const existing = new Set(current.map((item) => item.notification_id));
        return [...current, ...page.items.filter((item) => !existing.has(item.notification_id))];
      });
      setUnreadCount(page.unread_count);
      cursorRef.current = page.next_cursor;
      setNextCursor(page.next_cursor);
      setError(null);
      setErrorKind(null);
      setErrorScope(null);
      setCanRetryError(false);
    } catch (caught) {
      const failure = describeNotificationsLoadError(caught);
      if (failure.kind === 'invalid') {
        cursorRef.current = null;
        setNextCursor(null);
      }
      setError(failure.message);
      setErrorKind(failure.kind);
      setErrorScope('pagination');
      setCanRetryError(failure.canRetry);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [addToast]);

  const markAsRead = useCallback(async (id: string) => {
    const original = notifications.find((item) => item.notification_id === id);
    if (!original || original.read) return;

    setNotifications((current) => current.map((item) =>
      item.notification_id === id ? { ...item, read: true } : item,
    ));
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await apiFetch<void>(endpoints.notificationRead(id), { method: 'PATCH' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      if (caught instanceof ApiError && caught.status === 404) {
        setNotifications((current) => current.filter((item) => item.notification_id !== id));
        return;
      }
      if (caught instanceof ApiError && caught.status === 403) {
        console.info('[notifications] notificação não pertence ao usuário:', id);
        void loadNotifications();
        return;
      }
      setNotifications((current) => current.map((item) =>
        item.notification_id === id ? { ...item, read: false } : item,
      ));
      setUnreadCount((current) => current + 1);
      const failure = describeActionError(caught);
      addToast({ type: failure.tone, message: failure.message || 'Não foi possível marcar como lida.' });
    }
  }, [addToast, loadNotifications, notifications]);

  const markAllAsRead = useCallback(async () => {
    const previous = notifications;
    const previousUnreadCount = unreadCount;
    if (!previousUnreadCount) return;

    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await apiFetch<void>(endpoints.notificationsReadAll(), { method: 'PATCH' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      if (caught instanceof ApiError && caught.status === 403) {
        console.info('[notifications] não foi possível marcar todas como lidas:', caught.detail);
        void loadNotifications();
        return;
      }
      setNotifications(previous);
      setUnreadCount(previousUnreadCount);
      const failure = describeActionError(caught);
      addToast({ type: failure.tone, message: failure.message || 'Não foi possível marcar todas como lidas.' });
    }
  }, [addToast, loadNotifications, notifications, unreadCount]);

  const respondToParticipationRequest = useCallback(async (
    id: string,
    status: 'CONFIRMED' | 'REJECTED',
  ) => {
    const notification = notifications.find((item) => item.notification_id === id);
    const eventId = notification?.payload.event_id;
    const senderId = notification?.payload.sender?.id;
    if (!notification || notification.type !== 'EVENT_PARTICIPATION_REQUEST' || !eventId || !senderId) return;

    setProcessingIds((current) => new Set(current).add(id));
    setNotifications((current) => current.filter((item) => item.notification_id !== id));
    if (!notification.read) setUnreadCount((current) => Math.max(0, current - 1));

    // Só para diagnóstico: diz em qual chamada a resposta falhou.
    let step: 'lookup' | 'update' = 'lookup';

    try {
      // A notificação não traz o participant_id: acha-se o pendente pelo remetente.
      const page = await apiFetch<ParticipantsPage>(endpoints.eventParticipants(eventId, 'PENDING'));
      const participant: EventParticipantItem | undefined = page.items.find((item) => item.user.id === senderId);
      if (!participant) throw new ApiError('http', 404, 'Participant not found');

      step = 'update';
      await apiFetch(endpoints.eventParticipant(eventId, participant.participant_id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      addToast({
        type: 'success',
        message: status === 'CONFIRMED' ? 'Solicitação aprovada.' : 'Solicitação recusada.',
      });

      // A decisão já valeu: marcar como lida vem depois e nunca a bloqueia.
      if (!notification.read) {
        void apiFetch<void>(endpoints.notificationRead(id), { method: 'PATCH' }).catch((caught) => {
          console.info('[notifications] não foi possível marcar como lida após responder:', caught);
        });
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      console.warn('[notifications] falha ao responder solicitação de participação:', {
        step,
        notificationId: id,
        eventId,
        senderId,
        status: caught instanceof ApiError ? caught.status : null,
        detail: caught instanceof ApiError ? caught.detail : String(caught),
      });

      if (caught instanceof ApiError && caught.status === 404) {
        // Já respondida, cancelada ou de um evento que sumiu: a lista local está velha.
        // Antes isto só recarregava, em silêncio, e o card voltava sem explicação.
        addToast({
          type: 'warning',
          message: 'Essa solicitação não está mais disponível. Atualizamos a lista.',
        });
        void loadNotifications();
      } else {
        const restoredNotification = { ...notification };
        setNotifications((current) => current.some((item) => item.notification_id === id)
          ? current
          : [...current, restoredNotification].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ));
        if (!notification.read) setUnreadCount((current) => current + 1);
        const failure = describeActionError(caught);
        addToast({ type: failure.tone, message: failure.message || 'Não foi possível concluir a solicitação.' });
      }
    } finally {
      setProcessingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [addToast, loadNotifications, notifications]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    error,
    errorKind,
    errorScope,
    canRetryError,
    hasMore: nextCursor !== null,
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    respondToParticipationRequest,
    processingIds,
  }), [
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    error,
    errorKind,
    errorScope,
    canRetryError,
    nextCursor,
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    respondToParticipationRequest,
    processingIds,
  ]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
}
