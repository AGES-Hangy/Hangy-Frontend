import type { IconName } from '@/components/Icon/types';
import { NOTIFICATION_DEFINITIONS, UNKNOWN_NOTIFICATION } from '@/constants/notifications';
import type {
  Notification,
  NotificationContext,
  NotificationDestination,
  NotificationNavigation,
  NotificationType,
} from '@/types/notification';

export interface NotificationPresentation {
  icon: IconName;
  title: string;
  requiresAction: boolean;
  navigation: NotificationNavigation;
}

const MISSING_TARGET = { kind: 'unavailable', reason: 'missing-target' } as const;

/** Rotas e parâmetros já consumidos pelas telas de develop. Sem strings de URL concatenadas. */
export const NOTIFICATION_DESTINATIONS: Readonly<
  Record<NotificationDestination, (context: NotificationContext) => NotificationNavigation>
> = {
  connectionRequests: () => ({
    kind: 'pending-screen',
    pathname: '/Notifications/ConnectionRequests',
    task: '130',
  }),
  profile: ({ senderId, senderName }) => senderId
    ? { kind: 'route', href: { pathname: '/Profile', params: { userId: senderId, name: senderName } } }
    : MISSING_TARGET,
  manageEvent: ({ eventId }) => eventId
    ? { kind: 'route', href: { pathname: '/ManageEvent', params: { id: eventId } } }
    : MISSING_TARGET,
  eventDetail: ({ eventId }) => eventId
    ? { kind: 'route', href: { pathname: '/EventDetail', params: { id: eventId } } }
    : MISSING_TARGET,
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export function isNotificationType(type: string): type is NotificationType {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_DEFINITIONS, type);
}

/** Puro: não navega, não marca como lida e não executa ações de aceitar/recusar. */
export function getNotificationPresentation(
  notification: Pick<Notification, 'type' | 'payload'>,
): NotificationPresentation {
  if (!isNotificationType(notification.type)) {
    return {
      ...UNKNOWN_NOTIFICATION,
      navigation: { kind: 'unavailable', reason: 'unknown-type' },
    };
  }

  const payload = record(notification.payload);
  const sender = record(payload.sender);
  const context: NotificationContext = {
    eventId: text(payload.event_id),
    eventTitle: text(payload.event_title) ?? 'um evento',
    senderId: text(sender.id),
    senderName: text(sender.name) ?? 'Uma pessoa',
  };
  const definition = NOTIFICATION_DEFINITIONS[notification.type];

  return {
    icon: definition.icon,
    title: definition.title(context),
    requiresAction: definition.requiresAction,
    navigation: NOTIFICATION_DESTINATIONS[definition.destination](context),
  };
}
