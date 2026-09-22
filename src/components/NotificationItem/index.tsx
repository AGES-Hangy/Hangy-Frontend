import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AvatarGroup } from '@/components/AvatarGroup';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import type { NotificationItemProps } from '@/components/NotificationItem/types';
import { colors, palette } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const metrics = layout.notificationItem;

const ACTION_LABELS = {
  Request: { accept: 'Aprovar', reject: 'Recusar' },
  Connection: { accept: 'Confirmar', reject: 'Recusar' },
} as const;

function Thumb({ uri, size }: { uri?: string | null; size: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.thumb, { width: size, height: size }]} aria-hidden>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name="image" size={metrics.fallbackIconSize} color={palette.primary[400]} />
      )}
    </View>
  );
}

function Tappable({
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (!onPress) {
    return (
      <View style={style} accessible accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [style, pressed && { opacity: pressedOpacity }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

function renderLeading(props: NotificationItemProps) {
  switch (props.type) {
    case 'Request':
      if (props.avatarUri !== undefined) {
        return <Avatar size="XS" source={props.avatarUri ? { uri: props.avatarUri } : undefined} />;
      }
      // key por uri: sem ela o estado de falha persiste e a imagem seguinte já nasce no fallback.
      return <Thumb key={props.imageUri ?? ''} uri={props.imageUri} size={metrics.thumbSize} />;
    case 'Connection':
      return <Avatar size="XS" source={props.avatarUri ? { uri: props.avatarUri } : undefined} />;
    case 'Activity':
      return <Thumb key={props.imageUri ?? ''} uri={props.imageUri} size={metrics.thumbSize} />;
    case 'ConnectionGroup':
      return <AvatarGroup avatars={props.avatars} />;
  }
}

function renderTrailing(props: NotificationItemProps) {
  switch (props.type) {
    case 'Activity':
      return (
        <Thumb
          key={props.trailingImageUri ?? ''}
          uri={props.trailingImageUri}
          size={metrics.trailingThumbSize}
        />
      );
    case 'ConnectionGroup':
      return <Icon name="chevron-right" size={metrics.chevronSize} color={colors.text.tertiary} />;
    default:
      return null;
  }
}

export function NotificationItem(props: NotificationItemProps) {
  const { title, subtitle, read = false, onPress, style } = props;

  const hasActions =
    (props.type === 'Request' || props.type === 'Connection') &&
    (props.onAccept !== undefined || props.onReject !== undefined);

  const accessibilityLabel = read ? `${title}. ${subtitle}` : `Não lida. ${title}. ${subtitle}`;

  const text = (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );

  if (hasActions && (props.type === 'Request' || props.type === 'Connection')) {
    const labels = ACTION_LABELS[props.type];

    return (
      // Os botões ficam fora do nó acessível do texto: agrupados dentro dele,
      // o VoiceOver deixa de alcançá-los.
      <View style={[styles.item, styles.itemActions, !read && styles.itemUnread, style]}>
        {!read && <View style={styles.dot} />}
        {renderLeading(props)}

        <View style={styles.body}>
          <Tappable onPress={onPress} accessibilityLabel={accessibilityLabel} style={styles.text}>
            {text}
          </Tappable>

          <View style={styles.actions}>
            {props.onReject && (
              <Button
                label={labels.reject}
                variant="Secondary"
                size="SM"
                onPress={props.onReject}
                disabled={props.isProcessing}
                accessibilityLabel={`${labels.reject} — ${title}`}
              />
            )}
            {props.onAccept && (
              <Button
                label={labels.accept}
                size="SM"
                onPress={props.onAccept}
                isLoading={props.isProcessing}
                disabled={props.acceptDisabled}
                accessibilityLabel={`${labels.accept} — ${title}`}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[styles.item, styles.itemPlain, !read && styles.itemUnread, style]}
    >
      {!read && <View style={styles.dot} />}
      {renderLeading(props)}
      <View style={styles.body}>{text}</View>
      {renderTrailing(props)}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  itemActions: {
    minHeight: metrics.minHeightActions,
  },
  itemPlain: {
    minHeight: metrics.minHeightPlain,
  },
  itemUnread: {
    backgroundColor: palette.primary[50],
  },
  dot: {
    width: metrics.unreadDotSize,
    height: metrics.unreadDotSize,
    borderRadius: radius.full,
    backgroundColor: palette.secondary[500],
  },
  thumb: {
    borderRadius: radius.sm,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    gap: spacing[4],
  },
  text: {
    gap: spacing[4],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  title: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});

export type {
  NotificationItemActivityProps,
  NotificationItemConnectionGroupProps,
  NotificationItemConnectionProps,
  NotificationItemProps,
  NotificationItemRequestProps,
} from '@/components/NotificationItem/types';
