import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/layout';
import type { SectionHeaderProps } from './types';

/** Frame do Figma: h44. O alvo de toque da ação também tem 44, então a linha não cresce. */
const HEIGHT = 44;
const ACTION_HIT_SLOP = { left: spacing[8], right: spacing[8] };

export function SectionHeader({
  title,
  variant = 'title',
  action = false,
  showActionIcon = true,
  actionDisabled = false,
  actionLabel = 'Ver todos',
  onActionPress,
  actionAccessibilityLabel,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text
        style={[styles.titleBase, variant === 'overline' ? styles.overline : styles.title]}
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {action && (
        <Pressable
          onPress={onActionPress}
          disabled={actionDisabled}
          accessibilityState={{ disabled: actionDisabled }}
          aria-disabled={actionDisabled}
          style={styles.actionTouchArea}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
        >
          <Text style={[styles.actionLabel, actionDisabled && styles.actionLabelDisabled]} numberOfLines={1}>
            {actionLabel}
          </Text>
          {showActionIcon && (
            <Icon name="chevron-right" size={18} color={actionDisabled ? colors.text.disabled : palette.primary[600]} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HEIGHT,
    gap: spacing[8],
  },
  // O título cede espaço à ação em vez de empurrá-la para fora da tela.
  titleBase: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.h3,
    // Estilo Title: padding vertical space/12 do Figma.
    paddingVertical: spacing[12],
    color: colors.text.primary,
  },
  overline: {
    ...typography.overline,
    color: colors.text.tertiary,
  },
  actionTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    // Altura de 44 = alvo de toque; o texto e o chevron ficam rentes à margem de 16.
    minHeight: 44,
  },
  actionLabel: {
    ...typography.labelM,
    color: palette.primary[600],
  },
  actionLabelDisabled: { color: colors.text.disabled },
});
