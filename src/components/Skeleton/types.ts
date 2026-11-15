import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import type { radius } from '@/constants/layout';

/**
 * `Card` = placeholder do `EventCard/Featured` (320x288);
 * `Item` = placeholder do `EventCard/Compact` e do `ListItem` (até 520 x 88).
 */
export type SkeletonType = 'Card' | 'Item';

/** Bloco solto, para quem monta o skeleton da própria tela. */
export type SkeletonBlockProps = {
  type?: undefined;
  width?: DimensionValue;
  height: DimensionValue;
  /** Raio da escala do Design System. Padrão: `sm`. */
  radius?: keyof typeof radius;
  /** Escape hatch de layout (margem, `flex`). Não use para trocar a cor. */
  style?: StyleProp<ViewStyle>;
};

/** Variante pronta do Figma, com a mesma métrica do componente real. */
export type SkeletonPresetProps = {
  type: SkeletonType;
  /** Rótulo lido pelo leitor de tela. Padrão: "Carregando". */
  accessibilityLabel?: string;
  /** Escape hatch de layout (margem, `alignSelf`). Não use para trocar tamanho nem cor. */
  style?: StyleProp<ViewStyle>;
};

export type SkeletonProps = SkeletonBlockProps | SkeletonPresetProps;
