import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/Icon';

/** Aparência do botão — eixo `Variant` do Figma. */
export type ButtonVariant = 'Primary' | 'Secondary' | 'Accent' | 'Tertiary' | 'Danger';

/** Altura 52 / 44 / 36 — eixo `Size` do Figma. */
export type ButtonSize = 'LG' | 'MD' | 'SM';

export type ButtonProps = {
  /** Texto do botão. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Ícone à esquerda do label, com gap 8. Passe o nome do `Icon` para herdar
   * tamanho e cor da variante automaticamente; um elemento só quando precisar
   * de algo que não é um ícone do Design System.
   *
   * O elemento é `ReactElement`, e não `ReactNode`, de propósito: `ReactNode`
   * inclui `string`, o que faria qualquer texto passar no lugar de um nome de
   * ícone (`icon="compartilhr"` só quebraria em runtime). Assim o TypeScript
   * só aceita um nome que existe no mapa de ícones.
   */
  icon?: IconName | ReactElement;
  /** Bloqueia o toque e aplica o estado `Disabled`. */
  disabled?: boolean;
  /** Estado `Loading`: troca o label por um spinner e bloqueia o toque. */
  isLoading?: boolean;
  onPress?: () => void;
  /** Padrão: o próprio `label`. */
  accessibilityLabel?: string;
  /**
   * Escape hatch de layout (ex.: `{ alignSelf: 'stretch' }` para largura
   * total). Não use para sobrescrever cor, raio ou tipografia.
   */
  style?: StyleProp<ViewStyle>;
};
