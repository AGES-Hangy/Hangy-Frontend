import type { Ref } from 'react';
import type { StyleProp, View, ViewStyle } from 'react-native';

import type { UserType } from '@/types/event';
import type { ConnectionAnswerResult, ConnectionDirection, ConnectionStatus } from '@/types/user';

export type RelationshipButtonProps = {
  /** Escolhe o par de estados: conectar para `PERSONAL`, seguir para `BUSINESS`. */
  userType: UserType;
  /** Só vale para `PERSONAL`. `null` mostra "Conectar". */
  connectionStatus: ConnectionStatus | null;
  /** Só vale para `PENDING`. `RECEIVED` troca o botão pelo par Recusar/Confirmar. */
  connectionDirection?: ConnectionDirection | null;
  /** Só vale para `BUSINESS`. */
  isFollowing: boolean;
  onPress?: () => void;
  /** Resposta à solicitação recebida; sem ela, o par aparece desabilitado. */
  onAnswer?: (status: ConnectionAnswerResult['status']) => void;
  /** Linha acima do par Recusar/Confirmar, ex.: "Bruno quer se conectar com você." */
  requestText?: string;
  /** Padrão: o rótulo do estado. Quando o toque tem ação, diga qual, começando pelo rótulo. */
  accessibilityLabel?: string;
  disabled?: boolean;
  isLoading?: boolean;
  /** Escape hatch de layout (ex.: `{ alignSelf: 'stretch' }`). Não use para cor, raio ou tipografia. */
  style?: StyleProp<ViewStyle>;
  ref?: Ref<View>;
};
