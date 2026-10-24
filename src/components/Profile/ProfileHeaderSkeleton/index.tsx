import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Avatar `MD` do código, que é o `XL` (80) do frame. */
const AVATAR_DIAMETER = 80;

/** Blocos no lugar do avatar, do nome e da bio do `ProfileHeader`, com as mesmas medidas. */
export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={[styles.block, styles.avatar]} />
      </View>
      <View style={styles.identity}>
        <View style={[styles.block, styles.name]} />
        <View style={[styles.block, styles.description]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[12],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[20],
    paddingHorizontal: spacing[16],
  },
  identity: {
    gap: spacing[4],
    paddingHorizontal: spacing[16],
  },
  block: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  avatar: {
    width: AVATAR_DIAMETER,
    height: AVATAR_DIAMETER,
    borderRadius: radius.full,
  },
  name: {
    width: '60%',
    height: typography.h3.lineHeight,
  },
  description: {
    width: '90%',
    height: typography.bodyS.lineHeight,
  },
});
