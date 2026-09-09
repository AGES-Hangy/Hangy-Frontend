export type EventVariant = 'Featured' | 'Compact' | 'MapPreview' | 'Mini' | 'Request';
export type EventPrivacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type EventState = 'Default' | 'Confirmed' | 'Pending';

export interface Event {
  id: string;
  title: string;
  date: string; // Data formatada para exibição
  location: string;
  imageUrl: string;
  privacy: EventPrivacy;
  distance?: string;
  requesterName?: string;
}

export interface EventCardProps {
  variant: EventVariant;
  event: Event;
  state?: EventState;
  isNew?: boolean;
  onPress: () => void;
}