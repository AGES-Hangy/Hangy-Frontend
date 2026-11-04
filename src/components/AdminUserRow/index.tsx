import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import type { AdminUserRowProps, ModerationStatus } from './types';
import { colors, palette } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';

const MIN_HEIGHT = 72;
const BORDER_WIDTH = 1;
const AVATAR_SIZE = 56;

type ModerationVisual = {
  label: string;
  icon: IconName;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
};

const moderationVariantMap: Record<ModerationStatus, ModerationVisual> = {
  ACTIVE: {
    label: 'Ativo',
    icon: 'check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  SUSPENDED: {
    label: 'Suspenso',
    icon: 'clock',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  BANNED: {
    label: 'Banido',
    icon: 'x',
    textColor: palette.error.default,
    backgroundColor: palette.error.bg,
    borderColor: palette.error.default,
  },
};

const BADGE_HEIGHT = layout.badge.height;
const BADGE_HORIZONTAL_PADDING = layout.badge.paddingHorizontal;
const BADGE_ICON_SIZE = layout.badge.iconSize;
const BADGE_ICON_STROKE_WIDTH = layout.badge.iconStrokeWidth;
const BADGE_TEXT_GAP = layout.badge.textGap;
const BADGE_BORDER_WIDTH = layout.badge.borderWidth;

function ModerationBadge({ status }: { status: ModerationStatus }) {
  const visual = moderationVariantMap[status];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: visual.backgroundColor, borderColor: visual.borderColor },
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

export function AdminUserRow({
  name,
  summary,
  avatarUri,
  moderationStatus,
  onPress,
}: AdminUserRowProps) {
  const a11yLabel = summary ? `${name}. ${summary}` : name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.container, pressed && { opacity: pressedOpacity }]}
    >
      <Avatar
        variant="User"
        diameter={AVATAR_SIZE}
        source={avatarUri ? { uri: avatarUri } : undefined}
        accessibilityLabel={`Foto de ${name}`}
      />

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
        <ModerationBadge status={moderationStatus} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_HEIGHT,
    borderWidth: BORDER_WIDTH,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    padding: spacing[8],
    gap: spacing[12],
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  name: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  summary: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
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
  },
});

export type { AdminUserRowProps, ModerationStatus } from './types';
