import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Badge, resolveModerationVariant } from '@/components/Badge';
import type { AdminUserRowProps } from './types';
import { colors } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const metrics = layout.adminUserRow;
/**
 * No Figma a borda de 1px fica por dentro e o padding de 8 conta a partir da
 * borda externa. No React Native o padding começa depois da borda.
 */
const ROW_PADDING = spacing[8] - metrics.borderWidth;

function reportsLabel(count: number) {
  if (count === 0) return 'nenhuma denúncia';
  return `${count} ${count === 1 ? 'denúncia' : 'denúncias'}`;
}

function resolveSummary(props: AdminUserRowProps): string {
  if (props.summary !== undefined) return props.summary;
  if (props.moderationStatus === 'ACTIVE') {
    const events = `${props.eventCount} ${props.eventCount === 1 ? 'evento' : 'eventos'}`;
    return props.reportCount === undefined ? events : `${events} · ${reportsLabel(props.reportCount)}`;
  }
  if (props.moderationStatus === 'SUSPENDED') {
    return `Suspenso até ${props.untilDate} · ${reportsLabel(props.reportCount)}`;
  }
  return `Banido em ${props.untilDate} · ${reportsLabel(props.reportCount)}`;
}

export function AdminUserRow(props: AdminUserRowProps) {
  const { name, avatarUri, moderationStatus, onPress } = props;
  const summary = resolveSummary(props);
  const statusLabel = resolveModerationVariant(moderationStatus).label;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[name, summary, statusLabel].filter(Boolean).join('. ')}
      style={({ pressed }) => [styles.container, pressed && onPress && { opacity: pressedOpacity }]}
    >
      <Avatar
        variant="User"
        diameter={metrics.avatarSize}
        source={avatarUri ? { uri: avatarUri } : undefined}
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
      </View>

      <Badge family="Moderation" value={moderationStatus} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: metrics.minHeight,
    borderWidth: metrics.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    padding: ROW_PADDING,
    gap: spacing[12],
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: metrics.textGap,
  },
  name: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  summary: {
    ...typography.bodyS,
    color: colors.text.tertiary,
  },
});

export type { AdminUserRowProps, ModerationStatus } from './types';
