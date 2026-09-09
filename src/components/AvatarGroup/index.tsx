import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import type { AvatarGroupProps } from '@/components/AvatarGroup/types';
import { colors, palette } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Figma: Avatar MD de 40px, overlap -14 e anel branco de 2px. */
const AVATAR_SIZE = 40;
const OVERLAP = 14;
const RING_WIDTH = 2;
const MAX_VISIBLE = 3;
const MAX_AVATARS_BEFORE_COUNTER = MAX_VISIBLE - 1;

/**
 * Grupo de avatares para participantes. Mostra no máximo três círculos; ao
 * existir mais de três participantes, o terceiro passa a mostrar o contador.
 *
 * ```tsx
 * <AvatarGroup avatars={[{ source: user.photo }, { variant: 'User' }]} />
 * ```
 */
export function AvatarGroup({ avatars, accessibilityLabel, style }: AvatarGroupProps) {
  const hasOverflow = avatars.length > MAX_VISIBLE;
  const displayedAvatars = avatars.slice(0, hasOverflow ? MAX_AVATARS_BEFORE_COUNTER : MAX_VISIBLE);

  return (
    <View
      style={[styles.group, style]}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {displayedAvatars.map((avatar, index) => {
        return (
          <View
            key={index}
            style={[styles.avatar, index > 0 && styles.overlapped]}
          >
            <Avatar
              variant={avatar.variant}
              source={avatar.source}
              diameter={AVATAR_SIZE}
              accessibilityLabel={accessibilityLabel ? undefined : avatar.accessibilityLabel}
              style={StyleSheet.absoluteFill}
            />
          </View>
        );
      })}

      {hasOverflow && (
        <View style={[styles.counter, displayedAvatars.length > 0 && styles.overlapped]}>
          <Text style={styles.counterLabel}>+{avatars.length - MAX_AVATARS_BEFORE_COUNTER}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.full,
    borderWidth: RING_WIDTH,
    borderColor: colors.bg.base,
    backgroundColor: palette.primary[200],
  },
  overlapped: {
    marginLeft: -OVERLAP,
  },
  counter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
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
