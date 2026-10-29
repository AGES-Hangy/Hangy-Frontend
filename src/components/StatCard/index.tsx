import { StyleSheet, Text, View } from 'react-native';
import { colors, palette } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { radius, spacing } from '@/constants/layout';
import type { StatCardProps, StatCardTone } from './types';

function hasSupport(support: string | undefined): support is string {
  return support !== undefined && support.trim() !== '';
}

// Tokens por parâmetro para o teste rodar a função sem resolver os imports.
function statCardToneColors(tone: StatCardTone | undefined, colorTokens: typeof colors, paletteTokens: typeof palette) {
  switch (tone) {
    case 'Alert':
      return {
        backgroundColor: paletteTokens.error.bg,
        borderColor: paletteTokens.error.border,
        valueColor: paletteTokens.error.default,
      };
    case 'Success':
      return {
        backgroundColor: paletteTokens.success.bg,
        borderColor: paletteTokens.success.border,
        valueColor: paletteTokens.success.default,
      };
    default:
      return {
        backgroundColor: colorTokens.surface.card,
        borderColor: colorTokens.border.default,
        valueColor: colorTokens.text.primary,
      };
  }
}

function statCardAccessibilityLabel(label: string, value: string | number, support: string | undefined) {
  const parts = [label, String(value)];
  if (hasSupport(support)) parts.push(support);
  return parts.join(', ');
}

export function StatCard({ label, value, support, tone = 'Neutral', style }: StatCardProps) {
  const { backgroundColor, borderColor, valueColor } = statCardToneColors(tone, colors, palette);

  return (
    <View
      style={[styles.container, { backgroundColor, borderColor }, style]}
      accessible
      accessibilityLabel={statCardAccessibilityLabel(label, value, support)}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {hasSupport(support) && <Text style={styles.support}>{support}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[16],
    gap: spacing[4],
  },
  label: {
    ...typography.overline,
    // O Figma usa text/tertiary: 2,4 a 2,75:1 nos três fundos, abaixo dos 4,5:1 do WCAG 1.4.3.
    color: colors.text.secondary,
  },
  value: {
    ...typography.h1,
  },
  support: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});
