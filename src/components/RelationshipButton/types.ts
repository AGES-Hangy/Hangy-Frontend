import type { StyleProp, ViewStyle } from 'react-native';

import type { UserType } from '@/types/event';
import type { ConnectionStatus } from '@/types/user';

export type RelationshipButtonProps = {
  /** Escolhe o par de estados: conectar para `PERSONAL`, seguir para `BUSINESS`. */
  userType: UserType;
  /** Só vale para `PERSONAL`. `null` mostra "Conectar". */
  connectionStatus: ConnectionStatus | null;
  /** Só vale para `BUSINESS`. */
  isFollowing: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Escape hatch de layout (ex.: `{ alignSelf: 'stretch' }`). Não use para cor, raio ou tipografia. */
  style?: StyleProp<ViewStyle>;
};
