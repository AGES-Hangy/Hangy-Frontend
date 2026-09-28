/** Tipos de NotificationTypeEnum no backend. Não inclui convite nem recusa de conexão. */
export type NotificationType =
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

/** GET /notifications. O payload é aberto no backend e pode vir vazio. */
export interface Notification {
  notification_id: string;
  type: string; // Tipos futuros precisam continuar renderizando nas versões antigas do app.
  read: boolean;
  created_at: string;
  payload: Record<string, unknown>;
}

/** Campos usados pelo mapeamento, após validar o payload recebido. */
export interface NotificationContext {
  eventId?: string;
  eventTitle: string;
  senderId?: string;
  senderName: string;
}

export type NotificationDestination = 'connectionRequests' | 'profile' | 'manageEvent' | 'eventDetail';

export type NotificationNavigation =
  | {
      kind: 'route';
      href:
        | { pathname: '/EventDetail' | '/ManageEvent'; params: { id: string } }
        | { pathname: '/Profile'; params: { userId: string; name: string } };
    }
  | {
      /** Não passar ao router até a tela da task 130 estar integrada. */
      kind: 'pending-screen';
      pathname: '/Notifications/ConnectionRequests';
      task: '130';
    }
  | { kind: 'unavailable'; reason: 'unknown-type' | 'missing-target' };
