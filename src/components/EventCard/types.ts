export type EventVariant = 'Featured' | 'Compact' | 'MapPreview' | 'Mini' | 'Request';
export type EventPrivacy = 'Publico' | 'Privado' | 'PorConvite';
export type EventState = 'Default' | 'Confirmed' | 'Pending';

export interface Event {
  id: string;
  title: string;
  date: string; // Data formatada para exibição
  location: string;
  imageUrl: string;
  privacy: EventPrivacy;
}

export interface EventCardProps {
  variant: EventVariant;
  event: Event;
  privacy?: EventPrivacy;
  state?: EventState;
  isNew?: boolean;
  onPress: () => void;
}