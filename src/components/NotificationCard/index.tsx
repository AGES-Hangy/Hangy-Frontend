import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { NotificationItem } from '@/components/NotificationItem';
import { useEvent } from '@/hooks/useEvent';
import type { Notification } from '@/types/notification';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';

type NotificationCardBaseProps = {
  notification: Notification;
  presentation?: 'list' | 'carousel';
  onPress?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  acceptDisabled?: boolean;
  actionsDisabled?: boolean;
};

type ConnectionGroupCardProps = {
  notifications: readonly Notification[];
  onPress?: () => void;
};

export type NotificationCardProps = NotificationCardBaseProps | ConnectionGroupCardProps;

export type ConnectionRequestPeriodGroup = {
  period: string;
  notifications: Notification[];
};

export function connectionRequestPeriodKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function groupConnectionRequestsByPeriod(notifications: readonly Notification[]) {
  const grouped = new Map<string, Notification[]>();

  for (const notification of notifications) {
    const period = connectionRequestPeriodKey(notification.created_at);
    const items = grouped.get(period) ?? [];
    items.push(notification);
    grouped.set(period, items);
  }

  return [...grouped.entries()]
    .map(([period, items]) => ({ period, notifications: items }))
    .sort((first, second) => latestTimestamp(second.notifications) - latestTimestamp(first.notifications));
}

function latestTimestamp(notifications: readonly Notification[]) {
  return notifications.reduce((latest, item) => {
    const timestamp = new Date(item.created_at).getTime();
    return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
  }, 0);
}

function activityDate(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}

function connectionDate(value: string) {
  const formatted = formatRelativeTime(value);
  if (formatted === 'agora') return formatted;
  const match = formatted.match(/^há (\d+) ([a-z]+)$/);
  if (!match) return formatted;

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'min') return `há ${amount} ${amount === 1 ? 'minuto' : 'minutos'}`;
  if (unit === 'h') return `há ${amount} ${amount === 1 ? 'hora' : 'horas'}`;
  const days = Math.abs(Date.now() - new Date(value).getTime()) / 86_400_000;
  if (days >= 7) return 'há mais de 1 semana';
  return `há ${amount} ${amount === 1 ? 'dia' : 'dias'}`;
}

function activityCopy(notification: Notification) {
  const sender = notification.payload.sender?.name || 'Alguém';
  const event = notification.payload.event_title || 'um evento';
  const since = activityDate(notification.created_at);

  switch (notification.type) {
    case 'CONNECTION_ACCEPTED':
      return { title: `${sender} aceitou sua conexão`, subtitle: since };
    case 'EVENT_REQUEST_APPROVED':
      return { title: 'Sua solicitação foi aprovada', subtitle: `em ${event} · ${since}` };
    case 'EVENT_REQUEST_REJECTED':
      return { title: 'Sua solicitação foi recusada', subtitle: `em ${event} · ${since}` };
    case 'EVENT_PARTICIPANT_CANCELLED':
      return { title: `${sender} cancelou a presença`, subtitle: `em ${event} · ${since}` };
    case 'EVENT_PARTICIPANT_REMOVED':
      return { title: 'Você foi removido do evento', subtitle: `em ${event} · ${since}` };
    case 'EVENT_PARTICIPANT_JOINED':
      return { title: `${sender} confirmou presença`, subtitle: `em ${event} · ${since}` };
    case 'EVENT_UPDATED':
      return { title: `${event} foi atualizado`, subtitle: since };
    case 'EVENT_CANCELLED':
      return { title: `${event} foi cancelado`, subtitle: since };
    case 'EVENT_STARTING_SOON':
      return { title: `${event} começa em breve`, subtitle: since };
    default:
      return { title: 'Você tem uma nova notificação', subtitle: since };
  }
}

function ConnectionGroupCard({ notifications, onPress }: ConnectionGroupCardProps) {
  if (notifications.length === 0) return null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const unread = unreadCount > 0;
  const count = unread ? unreadCount : notifications.length;
  const latest = notifications.reduce((mostRecent, item) =>
    new Date(item.created_at).getTime() > new Date(mostRecent.created_at).getTime() ? item : mostRecent,
  );
  const title = count === 1
    ? unread ? '1 nova solicitação' : '1 solicitação'
    : unread ? `${count} novas solicitações` : `${count} solicitações`;

  return (
    <NotificationItem
      type="ConnectionGroup"
      title={title}
      subtitle={connectionDate(latest.created_at)}
      avatars={notifications.map((notification) => ({
        accessibilityLabel: notification.payload.sender?.name || 'Solicitação de conexão',
      }))}
      read={!unread}
      onPress={onPress}
    />
  );
}

function ParticipationRequestCard({
  notification,
  presentation,
  onPress,
  onAccept,
  onReject,
  isProcessing,
  acceptDisabled,
  actionsDisabled,
}: NotificationCardBaseProps & { presentation: 'list' | 'carousel' }) {
  const { event } = useEvent(notification.payload.event_id);
  const dateTime = event?.event_date ? formatDateTime(event.event_date) : '';
  const subtitle = [event?.title ?? notification.payload.event_title, dateTime].filter(Boolean).join(' · ');

  if (presentation === 'carousel') {
    const cardEvent: Event = {
      id: notification.payload.event_id ?? notification.notification_id,
      title: event?.title ?? notification.payload.event_title ?? 'Evento',
      date: event?.event_date ?? null,
      location: event?.location_name ?? null,
      imageUrl: event?.cover_photo_url ?? '',
      privacy: event?.privacy ?? 'PUBLIC',
      requesterName: notification.payload.sender?.name ?? 'Alguém',
    };

    return (
      <EventCard
        variant="Request"
        event={cardEvent}
        isUnread={!notification.read}
        onPress={onPress}
        actionsDisabled={actionsDisabled}
        onAcceptRequest={onAccept}
        onRejectRequest={onReject}
      />
    );
  }

  return (
    <NotificationItem
      type="Request"
      imageUri={event?.cover_photo_url ?? null}
      title={`${notification.payload.sender?.name || 'Alguém'} quer participar do seu evento`}
      subtitle={subtitle}
      read={notification.read}
      onPress={onPress}
      onAccept={onAccept}
      onReject={onReject}
      isProcessing={isProcessing}
      acceptDisabled={acceptDisabled}
      actionsDisabled={actionsDisabled}
    />
  );
}

function ConnectionRequestCard({
  notification,
  onPress,
  onAccept,
  onReject,
  isProcessing,
  acceptDisabled,
  actionsDisabled,
}: NotificationCardBaseProps) {
  return (
    <NotificationItem
      type="Connection"
      title={`${notification.payload.sender?.name || 'Alguém'} quer se conectar com você`}
      subtitle={connectionDate(notification.created_at)}
      read={notification.read}
      onPress={onPress}
      onAccept={onAccept}
      onReject={onReject}
      isProcessing={isProcessing}
      acceptDisabled={acceptDisabled}
      actionsDisabled={actionsDisabled}
    />
  );
}

function ActivityNotificationCard({ notification, onPress }: NotificationCardBaseProps) {
  const { event } = useEvent(notification.payload.event_id);
  const copy = activityCopy(notification);

  return (
    <NotificationItem
      type="Activity"
      title={copy.title}
      subtitle={copy.subtitle}
      trailingImageUri={event?.cover_photo_url ?? undefined}
      read={notification.read}
      onPress={onPress}
    />
  );
}

export function NotificationCard(props: NotificationCardProps) {
  if ('notifications' in props) {
    return <ConnectionGroupCard notifications={props.notifications} onPress={props.onPress} />;
  }

  switch (props.notification.type) {
    case 'EVENT_PARTICIPATION_REQUEST':
      return <ParticipationRequestCard {...props} presentation={props.presentation ?? 'list'} />;
    case 'CONNECTION_REQUEST':
      return <ConnectionRequestCard {...props} />;
    default:
      return <ActivityNotificationCard {...props} />;
  }
}
