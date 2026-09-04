import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import {
  resolveNotificationCount,
  resolvePrivacyVariant,
  resolveStatusVariant,
  type BadgeProps,
} from './types';
import { colors, palette } from '@/constants/colors';
import { layout, radius } from '@/constants/layout';
import { fontFamily, typography } from '@/constants/typography';

const BADGE_HEIGHT = layout.badge.height;
const BADGE_HORIZONTAL_PADDING = layout.badge.paddingHorizontal;
const BADGE_ICON_SIZE = layout.badge.iconSize;
const BADGE_ICON_STROKE_WIDTH = layout.badge.iconStrokeWidth;
const BADGE_TEXT_GAP = layout.badge.textGap;
const BADGE_BORDER_WIDTH = layout.badge.borderWidth;
const NOTIFICATION_ICON_SIZE = layout.badge.notificationIconSize;
const NOTIFICATION_ICON_STROKE_WIDTH = layout.badge.notificationIconStrokeWidth;
const NOTIFICATION_DOT_SIZE = layout.badge.notificationDotSize;
const NOTIFICATION_BUBBLE_MIN_WIDTH = layout.badge.notificationMinWidth;
const NOTIFICATION_PILL_HEIGHT = layout.badge.notificationPillHeight;
const NOTIFICATION_OFFSET = layout.badge.notificationOffset;
const NOTIFICATION_BUBBLE_TOP = layout.badge.notificationBubbleTop;
const NOTIFICATION_BUBBLE_RIGHT = layout.badge.notificationBubbleRight;
const NOTIFICATION_BUBBLE_BORDER_WIDTH = layout.badge.notificationBubbleBorderWidth;
const NOTIFICATION_CONTAINER_EXTRA_SIZE = layout.badge.notificationContainerExtraSize;
const NOTIFICATION_PILL_PADDING_HORIZONTAL = layout.badge.notificationPillPaddingHorizontal;
const NOTIFICATION_PILL_PADDING_VERTICAL = layout.badge.notificationPillPaddingVertical;
const NOTIFICATION_COUNT_FONT_SIZE = layout.badge.notificationCountFontSize;
const NOTIFICATION_COUNT_LINE_HEIGHT = layout.badge.notificationCountLineHeight;

function isNotificationBadgeProps(props: BadgeProps): props is Extract<BadgeProps, { family: 'Notification' }> {
  return props.family === 'Notification';
}

export function Badge(props: BadgeProps) {
  if (isNotificationBadgeProps(props)) {
    const notification = resolveNotificationCount(props.count);

    if (!notification) {
      return null;
    }

    return (
      <View
        style={styles.notificationBadge}
        accessibilityRole="image"
        accessibilityLabel={
          notification.type === 'count'
            ? `Notificações: ${notification.value}`
            : 'Notificações pendentes'
        }
      >
        <View style={styles.notificationIconWrap}>
          <Icon name="bell" size={NOTIFICATION_ICON_SIZE} color={colors.text.primary} strokeWidth={NOTIFICATION_ICON_STROKE_WIDTH} />
        </View>

        <View
          style={[
            styles.notificationBubble,
            notification.type === 'dot' ? styles.notificationDot : styles.notificationPill,
          ]}
        >
          {notification.type === 'count' ? (
            <Text style={styles.notificationCountText}>{notification.value}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  const visual =
    props.family === 'Privacy'
      ? resolvePrivacyVariant(props.value)
      : resolveStatusVariant(props.value);

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
    gap: BADGE_TEXT_GAP,
    height: BADGE_HEIGHT,
    paddingHorizontal: BADGE_HORIZONTAL_PADDING,
    borderRadius: radius.full,
    borderWidth: BADGE_BORDER_WIDTH,
  },
  badgeText: {
    includeFontPadding: false,
    fontFamily: fontFamily.base,
  },
  notificationBadge: {
    position: 'relative',
    width: NOTIFICATION_ICON_SIZE + NOTIFICATION_OFFSET + NOTIFICATION_CONTAINER_EXTRA_SIZE,
    height: NOTIFICATION_ICON_SIZE + NOTIFICATION_OFFSET + NOTIFICATION_CONTAINER_EXTRA_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIconWrap: {
    width: NOTIFICATION_ICON_SIZE,
    height: NOTIFICATION_ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBubble: {
    position: 'absolute',
    top: NOTIFICATION_BUBBLE_TOP,
    right: NOTIFICATION_BUBBLE_RIGHT,
    backgroundColor: palette.error.default,
    borderWidth: NOTIFICATION_BUBBLE_BORDER_WIDTH,
    borderColor: palette.neutral[0],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    width: NOTIFICATION_DOT_SIZE,
    height: NOTIFICATION_DOT_SIZE,
    borderRadius: NOTIFICATION_DOT_SIZE / 2,
  },
  notificationPill: {
    minWidth: NOTIFICATION_BUBBLE_MIN_WIDTH,
    height: NOTIFICATION_PILL_HEIGHT,
    borderRadius: radius.full,
    paddingHorizontal: NOTIFICATION_PILL_PADDING_HORIZONTAL,
    paddingVertical: NOTIFICATION_PILL_PADDING_VERTICAL,
  },
  notificationCountText: {
    fontSize: NOTIFICATION_COUNT_FONT_SIZE,
    lineHeight: NOTIFICATION_COUNT_LINE_HEIGHT,
    fontWeight: '700',
    color: colors.text.inverse,
    includeFontPadding: false,
  },
});

export type { BadgeFamily, BadgeProps, PrivacyBadgeValue, StatusBadgeValue } from './types';
export { getPrivacyBadgeLabel, getPrivacyBadgeValue, getStatusBadgeValue } from './utils';
export type { BackendPrivacy, BackendStatus } from './utils';
