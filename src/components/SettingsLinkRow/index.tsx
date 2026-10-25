import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors } from '@/constants/colors';
import { pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const BORDER_WIDTH = 1.5;
const ICON_SIZE = 24;
const MIN_TOUCH_SIZE = 44;

export type SettingsLinkRowProps = {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
};

/**
 * Linha de configuração que navega — SettingsRow/Link da Sprint 3 Components.
 * Igual ao SettingsRow, mas com chevron no lugar do Switch.
 */
export function SettingsLinkRow({ icon, title, description, onPress }: SettingsLinkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [styles.container, pressed && { opacity: pressedOpacity }]}
    >
      <Icon name={icon} size={ICON_SIZE} color={colors.text.primary} />

      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Icon name="chevron-right" size={ICON_SIZE} color={colors.text.secondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderWidth: BORDER_WIDTH,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  title: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});