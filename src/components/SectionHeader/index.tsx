import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { typography, fontFamily } from '@/constants/typography';
import { spacing } from '@/constants/layout';
import type { SectionHeaderProps } from './types';

export function SectionHeader({
  title,
  action = false,
  actionLabel = 'Ver todos',
  onActionPress,
  actionAccessibilityLabel,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {action && (
        <Pressable
          onPress={onActionPress}
          style={styles.actionTouchArea}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
        >
          <Text style={styles.actionLabel} numberOfLines={1}>
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={18} color={palette.primary[600]} />
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
    paddingVertical: spacing[12],
  },
  title: {
    ...typography.h3,
    fontFamily: fontFamily.base,
    color: colors.text.primary,
    flexShrink: 1,
  },
  actionTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: spacing[8],
  },
  actionLabel: {
    ...typography.labelM,
    fontFamily: fontFamily.base,
    color: palette.primary[600],
  },
});