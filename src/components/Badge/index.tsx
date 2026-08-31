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

const BADGE_HEIGHT = 32;
const BADGE_ICON_SIZE = 12;
const NOTIFICATION_ICON_SIZE = 18;
const NOTIFICATION_DOT_SIZE = 10;
const NOTIFICATION_BUBBLE_MIN_WIDTH = 18;
const NOTIFICATION_PILL_HEIGHT = 18;

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
        <Icon name="bell" size={NOTIFICATION_ICON_SIZE} color={colors.text.primary} />

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
      <Icon name={visual.icon} size={BADGE_ICON_SIZE} color={visual.textColor} />
      <Text style={[typography.caption, styles.badgeText, { color: visual.textColor }]}>{visual.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[4],
    minHeight: BADGE_HEIGHT,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  badgeText: {
    includeFontPadding: false,
  },
  notificationBadge: {
    position: 'relative',
    width: NOTIFICATION_ICON_SIZE + spacing[8],
    height: NOTIFICATION_ICON_SIZE + spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBubble: {
    position: 'absolute',
    top: 0,
    right: 0,
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
    paddingHorizontal: spacing[4],
  },
  notificationCountText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
    includeFontPadding: false,
  },
});

export type { BadgeFamily, BadgeProps, PrivacyBadgeValue, StatusBadgeValue } from '@/components/Badge/type';
