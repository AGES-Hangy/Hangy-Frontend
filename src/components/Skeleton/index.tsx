import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius as radiusScale } from '@/constants/layout';
import type { SkeletonProps } from './types';

/**
 * Bloco cinza no lugar de um conteúdo que ainda está carregando (task 165).
 *
 * Estático, como os skeletons que já existem no app (`ProfileEventListSkeleton`).
 * É decorativo: quem monta o skeleton da tela anuncia o carregamento uma vez só,
 * no container, para o leitor de tela não ler cada bloco.
 */
export function Skeleton({ width = '100%', height, radius = 'sm', style }: SkeletonProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius: radiusScale[radius] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface.sunken,
  },
});

export type { SkeletonProps } from './types';
