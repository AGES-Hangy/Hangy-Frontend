import type { IconName } from '@/components/Icon/types';
import type {
  NotificationContext,
  NotificationDestination,
  NotificationType,
} from '@/types/notification';

export interface NotificationDefinition {
  icon: IconName;
  title: (context: NotificationContext) => string;
  destination: NotificationDestination;
  requiresAction: boolean;
}

/** US6.2 / task 132. Ícones existentes no DS; o layout continua na task 130. */
export const NOTIFICATION_DEFINITIONS = {
  CONNECTION_REQUEST: {
    icon: 'users',
    title: ({ senderName }) => `${senderName} quer se conectar com você`,
    destination: 'connectionRequests',
    requiresAction: true,
  },
  CONNECTION_ACCEPTED: {
    icon: 'circle-check',
    title: ({ senderName }) => `${senderName} aceitou sua solicitação de conexão`,
    destination: 'profile',
    requiresAction: false,
  },
  EVENT_PARTICIPATION_REQUEST: {
    icon: 'users',
    title: ({ senderName, eventTitle }) => `${senderName} pediu para participar de ${eventTitle}`,
    destination: 'manageEvent',
    requiresAction: true,
  },
  EVENT_REQUEST_APPROVED: {
    icon: 'circle-check',
    title: ({ eventTitle }) => `Sua solicitação para participar de ${eventTitle} foi aprovada`,
    destination: 'eventDetail',
    requiresAction: false,
  },
  EVENT_REQUEST_REJECTED: {
    icon: 'circle-alert',
    title: ({ eventTitle }) => `Sua solicitação para participar de ${eventTitle} foi recusada`,
    destination: 'eventDetail',
    requiresAction: false,
  },
  EVENT_PARTICIPANT_CANCELLED: {
    icon: 'calendar-x',
    title: ({ senderName, eventTitle }) => `${senderName} cancelou a presença em ${eventTitle}`,
    destination: 'manageEvent',
    requiresAction: false,
  },
  EVENT_PARTICIPANT_REMOVED: {
    icon: 'circle-alert',
    title: ({ eventTitle }) => `Você foi removido de ${eventTitle}`,
    destination: 'eventDetail',
    requiresAction: false,
  },
  EVENT_PARTICIPANT_JOINED: {
    icon: 'users',
    title: ({ senderName, eventTitle }) => `${senderName} confirmou presença em ${eventTitle}`,
    destination: 'manageEvent',
    requiresAction: false,
  },
  EVENT_UPDATED: {
    icon: 'pencil',
    // O payload não informa qual campo mudou: não inventar data, horário ou local.
    title: ({ eventTitle }) => `${eventTitle} teve informações atualizadas`,
    destination: 'eventDetail',
    requiresAction: false,
  },
  EVENT_CANCELLED: {
    icon: 'calendar-x',
    title: ({ eventTitle }) => `${eventTitle} foi cancelado`,
    destination: 'eventDetail',
    requiresAction: false,
  },
  EVENT_STARTING_SOON: {
    icon: 'clock',
    title: ({ eventTitle }) => `${eventTitle} começa em breve`,
    destination: 'eventDetail',
    requiresAction: false,
  },
} as const satisfies Record<NotificationType, NotificationDefinition>;

export const UNKNOWN_NOTIFICATION = {
  icon: 'bell',
  title: 'Você tem uma nova notificação',
  requiresAction: false,
} as const satisfies { icon: IconName; title: string; requiresAction: boolean };
