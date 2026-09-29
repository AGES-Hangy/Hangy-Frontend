export const notificationTypes = [
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'EVENT_PARTICIPATION_REQUEST',
  'EVENT_REQUEST_APPROVED',
  'EVENT_REQUEST_REJECTED',
  'EVENT_PARTICIPANT_CANCELLED',
  'EVENT_PARTICIPANT_REMOVED',
  'EVENT_PARTICIPANT_JOINED',
  'EVENT_UPDATED',
  'EVENT_CANCELLED',
  'EVENT_STARTING_SOON',
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationPayload = {
  connection_id?: string;
  event_id?: string;
  event_title?: string;
  sender?: {
    id: string;
    name: string;
  };
};

export type Notification = {
  notification_id: string;
  type: NotificationType | (string & {});
  read: boolean;
  created_at: string;
  payload: NotificationPayload;
};

export type NotificationsPage = {
  items: Notification[];
  next_cursor: string | null;
  unread_count: number;
};

export type UnreadNotificationCount = {
  unread_count: number;
};
