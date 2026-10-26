import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export type TagPickerGroupProps = {
  /** Nome da área; aparece em caixa alta (estilo Overline). */
  label: string;
  /** Slot: os chips selecionáveis da área. */
  children?: ReactNode;
};

/**
 * Rótulo da área + chips para escolher — TagPickerGroup da Sprint 3
 * Components, usado nos modais de interesses.
 */
export function TagPickerGroup({ label, children }: TagPickerGroupProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label} accessibilityRole="header">
        {label.toUpperCase()}
      </Text>
      <View style={styles.slot}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[8],
  },
  label: {
    ...typography.overline,
    color: colors.text.tertiary,
  },
  slot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
});
