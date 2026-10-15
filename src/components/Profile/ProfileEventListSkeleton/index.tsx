import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';

const SKELETON_CARD_COUNT = 3;

/** Blocos no lugar dos cards do `ProfileEventList`, com a mesma caixa da lista. */
export function ProfileEventListSkeleton() {
  return (
    <View style={styles.list}>
      <View style={styles.cards} accessible accessibilityLabel="Carregando eventos" accessibilityRole="progressbar">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <View key={index} style={styles.card} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
  },
  cards: {
    gap: spacing[12],
  },
  card: {
    height: layout.eventCard.compactHeight,
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.md,
  },
});
