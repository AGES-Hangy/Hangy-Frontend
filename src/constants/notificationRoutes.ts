import type { Href } from 'expo-router';

import type { Notification, NotificationType } from '@/types/notification';

type NotificationRouteConfig = {
  /** Tela que já existe para receber o toque; nenhum tipo fica sem destino. */
  pathname: '/Profile' | '/ManageEvent' | '/EventDetail';
  /** De onde vem o id do destino: quem enviou a notificação ou o evento. */
  idSource: 'sender' | 'event';
};

/**
 * Destino de cada tipo. Quem organiza o evento cai na gestão dele
 * (`ManageEvent`); quem é o alvo do aviso cai no detalhe; pedidos e aceites de
 * conexão abrem o perfil de quem enviou.
 */
export const NOTIFICATION_ROUTE_BY_TYPE: Record<NotificationType, NotificationRouteConfig> = {
  CONNECTION_REQUEST: { pathname: '/Profile', idSource: 'sender' },
  CONNECTION_ACCEPTED: { pathname: '/Profile', idSource: 'sender' },
  EVENT_PARTICIPATION_REQUEST: { pathname: '/ManageEvent', idSource: 'event' },
  EVENT_REQUEST_APPROVED: { pathname: '/EventDetail', idSource: 'event' },
  EVENT_REQUEST_REJECTED: { pathname: '/EventDetail', idSource: 'event' },
  EVENT_PARTICIPANT_CANCELLED: { pathname: '/ManageEvent', idSource: 'event' },
  EVENT_PARTICIPANT_REMOVED: { pathname: '/EventDetail', idSource: 'event' },
  EVENT_PARTICIPANT_JOINED: { pathname: '/ManageEvent', idSource: 'event' },
  EVENT_UPDATED: { pathname: '/EventDetail', idSource: 'event' },
  EVENT_CANCELLED: { pathname: '/EventDetail', idSource: 'event' },
  EVENT_STARTING_SOON: { pathname: '/EventDetail', idSource: 'event' },
};

export function getNotificationDestination(notification: Notification): Href | null {
  const config = NOTIFICATION_ROUTE_BY_TYPE[notification.type as NotificationType];
  if (!config) return null;

  if (config.pathname === '/Profile') {
    const sender = notification.payload.sender;
    if (!sender?.id) return null;
    // `Profile` recebe o nome por parâmetro enquanto não existe a API de perfil.
    return { pathname: '/Profile', params: { userId: sender.id, name: sender.name } } as Href;
  }

  const id = notification.payload.event_id;
  if (!id) return null;
  return { pathname: config.pathname, params: { id } } as Href;
}

/** Marca como lida de forma otimista e abre o destino do tipo. */
export function openNotification(
  notification: Notification,
  markAsRead: (notificationId: string) => Promise<void>,
  navigate: (href: Href) => void,
  isOffline = false,
) {
  if (!isOffline) void markAsRead(notification.notification_id);

  const destination = getNotificationDestination(notification);
  if (destination) navigate(destination);
}
