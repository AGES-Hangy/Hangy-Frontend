import { StyleSheet, Text, View } from 'react-native';

import type { AdminHeaderProps } from './types';
import { colors } from '@/constants/colors';
import { layout, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const metrics = layout.adminHeader;

/**
 * Nenhuma variante do TopAppBar tem título à esquerda com uma ação de texto, e
 * todas somam `insets.top`, que o `Admin/_layout` já aplica.
 */
export function AdminHeader({ title, action }: AdminHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // No React Native a `height` inclui a borda.
    height: metrics.height + metrics.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    borderBottomWidth: metrics.borderWidth,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  title: {
    ...typography.h4,
    flexShrink: 1,
    color: colors.text.primary,
  },
});

export type { AdminHeaderProps } from './types';
