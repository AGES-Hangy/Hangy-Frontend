import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import type { radius } from '@/constants/layout';

export type SkeletonProps = {
  width?: DimensionValue;
  height: DimensionValue;
  /** Raio da escala do Design System. Padrão: `sm`. */
  radius?: keyof typeof radius;
  /** Escape hatch de layout (margem, `flex`). Não use para trocar a cor. */
  style?: StyleProp<ViewStyle>;
};
