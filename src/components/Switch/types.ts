import type { StyleProp, ViewStyle } from 'react-native';

export type SwitchProps = {
  /** Estado atual (ligado/desligado) — controlado por quem usa o Switch. */
  checked: boolean;
  /** Chamado ao tocar, já com o novo valor. */
  onChange: (checked: boolean) => void;
  /** Bloqueia o toque e aplica o visual desabilitado. */
  disabled?: boolean;
  /** Obrigatório: sem label visível, o leitor de tela só anuncia "switch". */
  accessibilityLabel: string;
  /** Escape hatch de layout. Não use para sobrescrever cor ou raio. */
  style?: StyleProp<ViewStyle>;
};