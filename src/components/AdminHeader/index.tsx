import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Barra de 56 do TopAppBar, sem o `paddingTop` 12 do frame: o `Admin/_layout` já aplica a safe area. */
const HEADER_HEIGHT = 56;
/** Borda inferior do TopAppBar no Figma; a constante do componente é local. */
const HEADER_BORDER_WIDTH = 1.5;

type AdminHeaderProps = {
  title: string;
  /** Ação à direita do título. */
  children?: ReactNode;
};

/**
 * Cabeçalho das seções do painel. Nenhuma variante do TopAppBar tem título à
 * esquerda sem o slot do voltar, e todas somam `insets.top`, que o
 * `Admin/_layout` já aplica.
 */
export function AdminHeader({ title, children }: AdminHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // No React Native a `height` inclui a borda.
    height: HEADER_HEIGHT + HEADER_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    borderBottomWidth: HEADER_BORDER_WIDTH,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  title: {
    ...typography.h4,
    flexShrink: 1,
    color: colors.text.primary,
  },
});
