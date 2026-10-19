import type { ImageProps } from 'expo-image';

export type EventVariant = 'Featured' | 'Compact' | 'MapPreview' | 'Mini' | 'Request';
export type EventPrivacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type EventState = 'Default' | 'Confirmed' | 'Pending';

export interface Event {
  id: string;
  title: string;
  date: string | null; // Eventos privados podem ocultar a data.
  location: string | null; // Eventos privados podem ocultar o local.
  imageUrl: string;
  /** Sem valor, o card oculta o selo em vez de assumir uma privacidade. */
  privacy?: EventPrivacy;
  distance?: string;
  /**
   * Local aproximado (evento privado para quem não foi aprovado). Em
   * `MapPreview`, `location` vira a linha da região e a data aparece no lugar
   * do selo de privacidade — o cadeado já está no pin.
   */
  isLocationApproximate?: boolean;
  requesterName?: string;
  /** Tags do evento — chips no rodapé de `Featured` e `Mini`. */
  tags?: string[];
  /** Prévia de quem confirmou — pilha de avatares no rodapé de `Featured` e `Mini`. */
  attendeeAvatars?: (ImageProps['source'] | null)[];
}

export interface EventCardProps {
  variant: EventVariant;
  event: Event;
  state?: EventState;
  /** Exibe o estado não lido no card Request. */
  isUnread?: boolean;
  onPress?: () => void;
  /** Desabilita as ações de solicitação quando o dispositivo está offline. */
  actionsDisabled?: boolean;
  /** Ações locais/da tela para cards de solicitação. */
  onAcceptRequest?: () => void;
  onRejectRequest?: () => void;
  /** Sino de notificações em `Featured` e `Mini`. Sem isto o sino fica decorativo. */
  onNotifyPress?: () => void;
}
