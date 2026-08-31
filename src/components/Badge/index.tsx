import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import {
  resolveNotificationCount,
  resolvePrivacyVariant,
  resolveStatusVariant,
  type BadgeProps,
} from '@/components/Badge/type';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const BADGE_HEIGHT = 24;
const BADGE_HORIZONTAL_PADDING = 10;
const BADGE_ICON_SIZE = 12;
const BADGE_TEXT_GAP = 6;
const BADGE_BORDER_WIDTH = 1.5;
const NOTIFICATION_ICON_SIZE = 16;
const NOTIFICATION_DOT_SIZE = 8;
const NOTIFICATION_BUBBLE_MIN_WIDTH = 10;
const NOTIFICATION_PILL_HEIGHT = 10;
const NOTIFICATION_OFFSET = 1;

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
          <Icon name="bell" size={NOTIFICATION_ICON_SIZE} color={colors.text.primary} strokeWidth={2.5} />
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
      <Icon name={visual.icon} size={BADGE_ICON_SIZE} color={visual.textColor} strokeWidth={2.25} />
      <Text style={[typography.overline, styles.badgeText, { color: visual.textColor }]}>
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
    fontFamily: 'Inter',
  },
  notificationBadge: {
    position: 'relative',
    width: NOTIFICATION_ICON_SIZE + NOTIFICATION_OFFSET + 2,
    height: NOTIFICATION_ICON_SIZE + NOTIFICATION_OFFSET + 2,
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
    top: -3,
    right: -1,
    backgroundColor: palette.error.default,
    borderWidth: 2,
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
    paddingHorizontal: 3,
    paddingVertical: 0,
  },
  notificationCountText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '700',
    color: colors.text.inverse,
    includeFontPadding: false,
  },
});

export type { BadgeFamily, BadgeProps, PrivacyBadgeValue, StatusBadgeValue } from '@/components/Badge/type';
