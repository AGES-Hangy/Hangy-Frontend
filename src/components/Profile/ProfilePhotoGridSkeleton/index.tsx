import { StyleSheet, View } from 'react-native';

import { PHOTO_GRID_COLUMNS, PHOTO_GRID_GAP } from '@/components/PhotoTile';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

const SKELETON_ROW_COUNT = 2;

/** Blocos quadrados no lugar das fotos do `ProfilePhotoGrid`, com a mesma grade. */
export function ProfilePhotoGridSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.grid} accessible accessibilityLabel="Carregando fotos" accessibilityRole="progressbar">
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: PHOTO_GRID_COLUMNS }, (_, column) => (
              <View key={column} style={styles.tile} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
  },
  grid: {
    gap: PHOTO_GRID_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: PHOTO_GRID_GAP,
  },
  // Como o `PhotoTile` `Default`: quadrado e sem raio.
  tile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface.sunken,
  },
});
