import type { StyleProp, ViewStyle } from 'react-native';

export type ProfileTabsVariant = 'segmented' | 'underline';

export type ProfileTabItem<Value extends string = string> = {
  /** Identificador estável retornado por `onChange`. */
  value: Value;
  /** Texto exibido na aba. */
  label: string;
  /** Impede a seleção desta aba. */
  disabled?: boolean;
};

export type ProfileTabsProps<Value extends string = string> = {
  /** Abas exibidas, na ordem visual. */
  items: ReadonlyArray<ProfileTabItem<Value>>;
  /** Aba atualmente selecionada. */
  value: Value;
  /** Chamado quando o usuário seleciona outra aba. */
  onChange: (value: Value) => void;
  /** Aparência do componente. Padrão: `segmented`. */
  variant?: ProfileTabsVariant;
  /** Permite apenas ajustes de posicionamento no contêiner. */
  style?: StyleProp<ViewStyle>;
};
