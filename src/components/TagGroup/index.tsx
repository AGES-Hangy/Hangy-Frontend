import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';

export type TagGroupProps = {
  /** Nome da área (macro). */
  label: string;
  /** Remove a área. Sem isto o chip macro perde o ×: a área está travada. */
  onRemove?: () => void;
  disabled?: boolean;
  /** Slot: os chips micro da área e o "+ Adicionar". */
  children?: ReactNode;
};

/**
 * Uma área de interesse com as micro dela — TagGroup da Sprint 3 Components:
 * chip macro removível no topo e, no slot, os chips micro.
 *
 * ```tsx
 * <TagGroup label="Esportes" onRemove={removerEsportes}>
 *   <Chip label="Futebol" categoryType="micro" isSelected showRemoveIcon />
 * </TagGroup>
 * ```
 */
export function TagGroup({ label, onRemove, disabled = false, children }: TagGroupProps) {
  return (
    <View style={styles.container}>
      <Chip
        label={label}
        categoryType="macro"
        isSelected
        disabled={disabled}
        showRemoveIcon={Boolean(onRemove)}
        onRemove={onRemove}
        onPress={onRemove}
        accessibilityLabel={onRemove ? `Remover área ${label}` : label}
      />
      <View style={styles.slot}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[8],
    padding: spacing[12],
    borderRadius: radius.lg,
    backgroundColor: colors.bg.subtle,
  },
  slot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
});
