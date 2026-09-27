import type { Event } from '@/components/EventCard/types';

/** Dados de demonstração baseados nos usuários, eventos e tipos de aviso do seed do backend. */
export const mockParticipationRequests: Event[] = [
  {
    id: 'mock-request-sunset-rafaela',
    title: 'Pôr do sol no Cais',
    date: '2026-08-16T16:00:00-03:00',
    location: 'Cais Embarcadero',
    imageUrl: 'https://picsum.photos/seed/cais/800/450',
    privacy: 'PUBLIC',
    requesterName: 'Rafaela',
  },
  {
    id: 'mock-request-football-lucas',
    title: 'Futebol na Orla',
    date: '2026-08-17T10:00:00-03:00',
    location: 'Orla do Guaíba',
    imageUrl: 'https://picsum.photos/seed/futebol/800/450',
    privacy: 'PUBLIC',
    requesterName: 'Lucas',
  },
  {
    id: 'mock-request-friends-roger',
    title: 'Noite com os Amigos',
    date: '2026-08-21T21:00:00-03:00',
    location: 'Porto Alegre',
    imageUrl: 'https://picsum.photos/seed/amigos/800/450',
    privacy: 'PUBLIC',
    requesterName: 'Roger',
  },
];

export type MockConnectionRequest = {
  id: string;
  name: string;
  timeAgo: string;
  createdMinutesAgo: number;
};

export const mockConnectionRequestItems: readonly MockConnectionRequest[] = [
  { id: 'mock-connection-roberta', name: 'Roberta', timeAgo: 'há 2 horas', createdMinutesAgo: 20 },
  { id: 'mock-connection-giovana', name: 'Giovana', timeAgo: 'há 21 horas', createdMinutesAgo: 40 },
  { id: 'mock-connection-ricardo', name: 'Ricardo', timeAgo: 'há 2 dias', createdMinutesAgo: 60 },
  { id: 'mock-connection-antonio', name: 'Antonio', timeAgo: 'há mais de 1 semana', createdMinutesAgo: 80 },
];

export type MockActivityNotification = {
  id: string;
  title: string;
  subtitle: string;
  eventImageUri?: string;
  read: boolean;
  createdMinutesAgo: number;
};

/** Atividades longas para conferir o scroll; os títulos espelham os tipos do seed. */
export const mockActivityNotifications: readonly MockActivityNotification[] = [
  {
    id: 'mock-activity-participants-parcao',
    title: 'Felipe + 1 confirmaram presença',
    subtitle: 'em Futebol na Orla · há 5 h',
    eventImageUri: 'https://picsum.photos/seed/futebol/160/160',
    read: false,
    createdMinutesAgo: 300,
  },
  {
    id: 'mock-activity-poker',
    title: 'Flávia + 3 confirmaram presença',
    subtitle: 'em Poker e Sinuca · há 12 h',
    eventImageUri: 'https://picsum.photos/seed/poker/160/160',
    read: false,
    createdMinutesAgo: 720,
  },
  {
    id: 'mock-activity-approved',
    title: 'Sua solicitação foi aprovada',
    subtitle: 'Você entrou em Pôr do sol no Cais · há 12 h',
    eventImageUri: 'https://picsum.photos/seed/cais/160/160',
    read: false,
    createdMinutesAgo: 730,
  },
  {
    id: 'mock-activity-rejected',
    title: 'Sua solicitação foi recusada',
    subtitle: 'para Noite de Jogos · há 1 dia',
    eventImageUri: 'https://picsum.photos/seed/jogos/160/160',
    read: false,
    createdMinutesAgo: 1440,
  },
  {
    id: 'mock-activity-cancelled-presence',
    title: 'Lucas cancelou a presença',
    subtitle: 'em Futebol na Orla · há 2 h',
    eventImageUri: 'https://picsum.photos/seed/futebol/160/160',
    read: false,
    createdMinutesAgo: 120,
  },
  {
    id: 'mock-activity-removed',
    title: 'Você foi removido do evento',
    subtitle: 'Pôr do sol no Cais · há 6 h',
    eventImageUri: 'https://picsum.photos/seed/cais/160/160',
    read: false,
    createdMinutesAgo: 360,
  },
  {
    id: 'mock-activity-connection',
    title: 'Roberta aceitou sua conexão',
    subtitle: 'Vocês agora estão conectados · há 8 h',
    eventImageUri: 'https://picsum.photos/seed/futebol/160/160',
    read: false,
    createdMinutesAgo: 480,
  },
  {
    id: 'mock-activity-event-updated',
    title: 'Futebol na Orla mudou de horário',
    subtitle: 'Novo horário: 17h · há 4 h',
    eventImageUri: 'https://picsum.photos/seed/futebol/160/160',
    read: false,
    createdMinutesAgo: 240,
  },
  {
    id: 'mock-activity-game-cancelled',
    title: 'Noite de Jogos foi cancelado',
    subtitle: 'pelo organizador · há 1 dia',
    eventImageUri: 'https://picsum.photos/seed/jogos/160/160',
    read: false,
    createdMinutesAgo: 1500,
  },
  {
    id: 'mock-activity-starting',
    title: 'Pôr do sol no Cais começa em breve',
    subtitle: 'Hoje às 18h · há 10 min',
    eventImageUri: 'https://picsum.photos/seed/cais/160/160',
    read: false,
    createdMinutesAgo: 10,
  },
];

export type MockNotification =
  | {
      id: string;
      type: 'Request';
      createdAt: string;
      read: boolean;
      event: Event;
    }
  | {
      id: string;
      type: 'Connection';
      createdAt: string;
      read: boolean;
      name: string;
      timeAgo: string;
    }
  | ({
      id: string;
      type: 'Activity';
      createdAt: string;
    } & MockActivityNotification);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** Feed demonstrativo único, usado para conferir ordenação, leitura e agrupamento temporal. */
export const mockNotificationFeed: MockNotification[] = [
  ...mockParticipationRequests.map((event, index) => ({
    id: event.id,
    type: 'Request' as const,
    createdAt: minutesAgo([12, 35, 70][index] ?? 90),
    read: false,
    event,
  })),
  ...mockConnectionRequestItems.map((request) => ({
    ...request,
    type: 'Connection' as const,
    createdAt: minutesAgo(request.createdMinutesAgo),
    read: false,
  })),
  ...mockActivityNotifications.map((notification) => ({
    ...notification,
    type: 'Activity' as const,
    createdAt: minutesAgo(notification.createdMinutesAgo),
  })),
];
