import type { Href } from 'expo-router';

import type { Notification, NotificationType } from '@/types/notification';

type NotificationRouteConfig = {
  pathname: '/UserProfile' | '/EventParticipants' | '/EventDetail';
  idSource: 'sender' | 'event';
  screenImplemented: boolean;
};

/** Destinos previstos para cada tipo, conforme o fluxo de notificações. */
export const NOTIFICATION_ROUTE_BY_TYPE: Record<NotificationType, NotificationRouteConfig> = {
  CONNECTION_REQUEST: { pathname: '/UserProfile', idSource: 'sender', screenImplemented: false },
  CONNECTION_ACCEPTED: { pathname: '/UserProfile', idSource: 'sender', screenImplemented: false },
  EVENT_PARTICIPATION_REQUEST: { pathname: '/EventParticipants', idSource: 'event', screenImplemented: false },
  EVENT_REQUEST_APPROVED: { pathname: '/EventDetail', idSource: 'event', screenImplemented: true },
  EVENT_REQUEST_REJECTED: { pathname: '/EventDetail', idSource: 'event', screenImplemented: true },
  EVENT_PARTICIPANT_CANCELLED: { pathname: '/EventParticipants', idSource: 'event', screenImplemented: false },
  EVENT_PARTICIPANT_REMOVED: { pathname: '/EventParticipants', idSource: 'event', screenImplemented: false },
  EVENT_PARTICIPANT_JOINED: { pathname: '/EventParticipants', idSource: 'event', screenImplemented: false },
  EVENT_UPDATED: { pathname: '/EventDetail', idSource: 'event', screenImplemented: true },
  EVENT_CANCELLED: { pathname: '/EventDetail', idSource: 'event', screenImplemented: true },
  EVENT_STARTING_SOON: { pathname: '/EventDetail', idSource: 'event', screenImplemented: true },
};

export function getNotificationDestination(notification: Notification) {
  const config = NOTIFICATION_ROUTE_BY_TYPE[notification.type as NotificationType];
  if (!config) return null;

  const id = config.idSource === 'sender'
    ? notification.payload.sender?.id
    : notification.payload.event_id;
  if (!id) return null;

  return {
    href: { pathname: config.pathname, params: { id } } as Href,
    screenImplemented: config.screenImplemented,
  };
}

/** Marca primeiro de forma otimista; destinos de telas futuras ficam preparados no mapa. */
export function openNotification(
  notification: Notification,
  markAsRead: (notificationId: string) => Promise<void>,
  navigate: (href: Href) => void,
  isOffline = false,
) {
  if (!isOffline) void markAsRead(notification.notification_id);

  const destination = getNotificationDestination(notification);
  if (destination?.screenImplemented) navigate(destination.href);
}
