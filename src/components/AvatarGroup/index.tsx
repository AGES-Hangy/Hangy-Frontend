import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import type { AvatarGroupProps } from '@/components/AvatarGroup/types';
import { colors, palette } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Figma: Avatar MD de 40px, overlap -14 e anel branco de 2px. */
const DEFAULT_AVATAR_SIZE = 40;
const DEFAULT_OVERLAP = 14;
const RING_WIDTH = 2;
const MAX_VISIBLE = 3;
const MAX_AVATARS_BEFORE_COUNTER = MAX_VISIBLE - 1;

/**
 * Grupo de avatares para participantes. Mostra no máximo três círculos; ao
 * existir mais de três participantes, o terceiro passa a mostrar o contador.
 *
 * ```tsx
 * <AvatarGroup avatars={[{ source: user.photo }, { variant: 'User' }]} />
 * // Pilha pequena (24px), como no rodapé do EventCard:
 * <AvatarGroup avatars={attendees} size={24} overlap={8} />
 * ```
 */
export function AvatarGroup({
  avatars,
  accessibilityLabel,
  size = DEFAULT_AVATAR_SIZE,
  overlap = DEFAULT_OVERLAP,
  style,
}: AvatarGroupProps) {
  const hasOverflow = avatars.length > MAX_VISIBLE;
  const displayedAvatars = avatars.slice(0, hasOverflow ? MAX_AVATARS_BEFORE_COUNTER : MAX_VISIBLE);
  const overlapStyle = { marginLeft: -overlap };

  return (
    <View
      style={[styles.group, { height: size }, style]}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {displayedAvatars.map((avatar, index) => {
        return (
          <View
            key={index}
            style={[styles.avatar, { width: size, height: size }, index > 0 && overlapStyle]}
          >
            <Avatar
              variant={avatar.variant}
              source={avatar.source}
              diameter={size}
              accessibilityLabel={accessibilityLabel ? undefined : avatar.accessibilityLabel}
              style={StyleSheet.absoluteFill}
            />
          </View>
        );
      })}

      {hasOverflow && (
        <View style={[styles.counter, { width: size, height: size }, displayedAvatars.length > 0 && overlapStyle]}>
          <Text style={[styles.counterLabel, size < 32 && typography.badge]}>
            +{avatars.length - MAX_AVATARS_BEFORE_COUNTER}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.full,
    borderWidth: RING_WIDTH,
    borderColor: colors.bg.base,
    backgroundColor: palette.primary[200],
  },
  counter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: RING_WIDTH,
    borderColor: colors.bg.base,
    backgroundColor: palette.primary[700],
  },
  counterLabel: {
    ...typography.labelM,
    color: colors.text.inverse,
  },
});

export type { AvatarGroupItem, AvatarGroupProps } from '@/components/AvatarGroup/types';
