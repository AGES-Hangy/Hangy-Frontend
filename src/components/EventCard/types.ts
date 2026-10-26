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
  requesterName?: string;
  /** Tags do evento — chips no rodapé de `Featured` e `Mini`. */
  tags?: string[];
  /** Se quem está vendo favoritou o evento — `is_favorited` do feed. */
  isFavorited?: boolean;
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
  /**
   * Estrela de favorito em `Featured` e `Mini`, igual à do detalhe do evento.
   * Sem isto a estrela não aparece — quem não pode favoritar (estabelecimento)
   * não vê um botão morto.
   */
  onFavoritePress?: () => void;
  /** Estado da estrela: fundo roxo e estrela cheia quando `true`. */
  isFavorited?: boolean;
}
