import type { StyleProp, ViewStyle } from 'react-native';

export type ProfileTab = 'history' | 'events' | 'gallery';

export type ProfileTabsProps = {
  /** Aba atualmente selecionada. */
  value: ProfileTab;
  /** Chamado quando o usuário seleciona outra aba. */
  onChange: (value: ProfileTab) => void;
  /** Permite apenas ajustes de posicionamento no contêiner. */
  style?: StyleProp<ViewStyle>;
};
