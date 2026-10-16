import type { StyleProp, ViewStyle } from 'react-native';

export type ProfileTabsVariant = 'segmented' | 'listHeader';

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
  /**
   * Nome do grupo de abas para o leitor de tela. Obrigatório na prática quando
   * a tela tem mais de uma barra, para distinguir uma da outra.
   */
  accessibilityLabel?: string;
  /** Permite apenas ajustes de posicionamento no contêiner. */
  style?: StyleProp<ViewStyle>;
};
