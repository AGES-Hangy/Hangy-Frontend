import type { StyleProp, ViewStyle } from 'react-native';

import type { AvatarGroupItem } from '@/components/AvatarGroup/types';

type NotificationItemBaseProps = {
  title: string;
  subtitle: string;
  /** Padrão: false — não lida ganha fundo primary/50 e o ponto de 8px à esquerda. */
  read?: boolean;
  /**
   * Torna o item inteiro tocável. Sem ele o item não é acionável e não recebe
   * accessibilityRole — o leitor de tela anuncia só o texto.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Eixo dos tipos que decidem uma solicitação: Request e Connection. */
type NotificationActionProps = {
  onAccept?: () => void;
  onReject?: () => void;
  /** Requisição em voo: spinner no botão de aceitar, sem congelar a lista. */
  isProcessing?: boolean;
  /** Evento lotado desabilita só o aceitar; recusar continua valendo. */
  acceptDisabled?: boolean;
};

/**
 * Solicitação para participar de um evento. `imageUri` é a capa do evento
 * (caso do frame) e `avatarUri` a foto de quem pediu, para contextos em que
 * o evento é implícito — mutuamente exclusivas, fallback no ícone `image`.
 * Para a foto de pessoa sem URL, passe `avatarUri={null}`: omitir as duas
 * props cai no ícone `image`.
 */
export type NotificationItemRequestProps = NotificationItemBaseProps &
  NotificationActionProps & { type: 'Request' } & (
    | { imageUri?: string | null; avatarUri?: never }
    | { avatarUri?: string | null; imageUri?: never }
  );

/** Pedido de conexão entre pessoas — a foto é sempre da pessoa. */
export type NotificationItemConnectionProps = NotificationItemBaseProps &
  NotificationActionProps & {
    type: 'Connection';
    avatarUri?: string | null;
  };

/** Aviso sobre um evento, sem decisão a tomar. */
export type NotificationItemActivityProps = NotificationItemBaseProps & {
  type: 'Activity';
  imageUri?: string | null;
  /**
   * Capa do evento à direita. Decorativa: fica fora da árvore de
   * acessibilidade, e o que ela representa entra no label agregado do item.
   */
  trailingImageUri?: string | null;
};

/**
 * Solicitações agrupadas. O `AvatarGroup` mostra até dois avatares e
 * transforma o excedente em `+N`, então basta um item por pessoa — o rótulo
 * acessível deriva de `avatars.length`.
 */
export type NotificationItemConnectionGroupProps = NotificationItemBaseProps & {
  type: 'ConnectionGroup';
  avatars: readonly AvatarGroupItem[];
};

export type NotificationItemProps =
  | NotificationItemRequestProps
  | NotificationItemConnectionProps
  | NotificationItemActivityProps
  | NotificationItemConnectionGroupProps;
