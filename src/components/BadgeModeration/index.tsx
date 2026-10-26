import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { resolveModerationVariant, type BadgeModerationProps } from '@/components/BadgeModeration/types';
import { layout, radius } from '@/constants/layout';
import { typography } from '@/constants/typography';

const BADGE_HEIGHT = layout.badgeModeration.height;
const BADGE_HORIZONTAL_PADDING = layout.badgeModeration.paddingHorizontal;
const BADGE_GAP = layout.badgeModeration.gap;
const BADGE_BORDER_WIDTH = layout.badgeModeration.borderWidth;
const BADGE_ICON_SIZE = layout.badgeModeration.iconSize;
const BADGE_ICON_STROKE_WIDTH = layout.badgeModeration.iconStrokeWidth;

/**
 * Estado de moderação de uma conta ou denúncia no painel administrativo.
 * Um `value` que o app ainda não mapeia cai num fallback neutro em vez de quebrar a tela.
 *
 * ```tsx
 * <BadgeModeration value="EmAnalise" />
 * ```
 */
export function BadgeModeration({ value }: BadgeModerationProps) {
  const visual = resolveModerationVariant(value);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
      ]}
      accessibilityRole="text"
    >
      <Icon name={visual.icon} size={BADGE_ICON_SIZE} color={visual.textColor} strokeWidth={BADGE_ICON_STROKE_WIDTH} />
      <Text style={[typography.badge, styles.badgeText, { color: visual.textColor }]}>
        {visual.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: BADGE_GAP,
    height: BADGE_HEIGHT,
    paddingHorizontal: BADGE_HORIZONTAL_PADDING,
    borderRadius: radius.full,
    borderWidth: BADGE_BORDER_WIDTH,
  },
  badgeText: {
    includeFontPadding: false,
  },
});

export type { BadgeModerationProps, BadgeModerationValue } from '@/components/BadgeModeration/types';
export { badgeModerationValues, resolveModerationVariant } from '@/components/BadgeModeration/types';
