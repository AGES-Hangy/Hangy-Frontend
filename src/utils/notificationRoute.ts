import type { Href } from 'expo-router';

type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'EVENT_PARTICIPATION_REQUEST'
  | 'EVENT_REQUEST_APPROVED'
  | 'EVENT_REQUEST_REJECTED'
  | 'EVENT_PARTICIPANT_CANCELLED'
  | 'EVENT_PARTICIPANT_REMOVED'
  | 'EVENT_PARTICIPANT_JOINED'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'EVENT_STARTING_SOON';

type NotificationData = Record<string, unknown>;
type RouteBuilder = (data: NotificationData) => Href | null;

const NOTIFICATIONS: Href = '/Notifications';

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

const toEventDetail: RouteBuilder = ({ event_id }) =>
  nonEmpty(event_id) ? { pathname: '/EventDetail', params: { id: event_id } } : null;

const toManageEvent: RouteBuilder = ({ event_id }) =>
  nonEmpty(event_id) ? { pathname: '/ManageEvent', params: { id: event_id } } : null;

const toProfile: RouteBuilder = ({ user_id }) =>
  nonEmpty(user_id) ? { pathname: '/Profile', params: { userId: user_id } } : null;

const ROUTE_BY_TYPE: Record<NotificationType, RouteBuilder> = {
  EVENT_PARTICIPATION_REQUEST: toManageEvent,
  EVENT_PARTICIPANT_JOINED: toManageEvent,
  EVENT_PARTICIPANT_CANCELLED: toManageEvent,
  EVENT_REQUEST_APPROVED: toEventDetail,
  EVENT_REQUEST_REJECTED: toEventDetail,
  EVENT_UPDATED: toEventDetail,
  EVENT_CANCELLED: toEventDetail,
  EVENT_STARTING_SOON: toEventDetail,
  // Iguais ao destino de cada tipo na central (constants/notificationRoutes).
  EVENT_PARTICIPANT_REMOVED: toEventDetail,
  CONNECTION_REQUEST: toProfile,
  CONNECTION_ACCEPTED: toProfile,
};

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROUTE_BY_TYPE, value);
}

/** Rota aberta pelo toque na notificação; tipo desconhecido ou campo faltando cai na central. */
export function notificationRoute(data: unknown): Href {
  if (typeof data !== 'object' || data === null) return NOTIFICATIONS;
  const fields = data as NotificationData;
  if (!isNotificationType(fields.type)) return NOTIFICATIONS;
  return ROUTE_BY_TYPE[fields.type](fields) ?? NOTIFICATIONS;
}
