import type { ImageProps } from 'expo-image';

export type EventVariant = 'Featured' | 'Compact' | 'MapPreview' | 'Mini' | 'Request';
export type EventPrivacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type EventState = 'Default' | 'Confirmed' | 'Pending';

export interface Event {
  id: string;
  title: string;
  date: string; // ISO 8601 — o card formata para exibição
  location: string;
  imageUrl: string;
  privacy: EventPrivacy;
  distance?: string;
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
  isNew?: boolean;
  onPress: () => void;
  /** Sino de notificações em `Featured` e `Mini`. Sem isto o sino fica decorativo. */
  onNotifyPress?: () => void;
}
