import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/Icon';

/** Aparência do botão — eixo `Variant` do Figma. */
export type IconButtonVariant = 'Filled' | 'Tonal' | 'Outline' | 'Ghost';

/** Diâmetro 52 / 44 / 36 — eixo `Size` do Figma. */
export type IconButtonSize = 'LG' | 'MD' | 'SM';

export type IconButtonProps = {
  /**
   * Ícone do botão. Passe o nome do `Icon` para herdar tamanho e cor da
   * variante automaticamente; um `ReactNode` só quando precisar de algo que
   * não é um ícone do Design System.
   */
  icon: IconName | ReactNode;
  /**
   * Obrigatório: o botão não tem texto, então sem isto o leitor de tela
   * anuncia só "botão".
   */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Bloqueia o toque e aplica o estado desabilitado. */
  disabled?: boolean;
  onPress?: () => void;
  /** Escape hatch de layout. Não use para sobrescrever cor ou raio. */
  style?: StyleProp<ViewStyle>;
};
