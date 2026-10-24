import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PHOTO_GRID_COLUMNS, PHOTO_GRID_GAP, PhotoTile } from '@/components/PhotoTile';
import type { ProfilePhotoGridProps } from '@/components/Profile/ProfilePhotoGrid/types';
import { ProfilePhotoGridSkeleton } from '@/components/Profile/ProfilePhotoGridSkeleton';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { spacing } from '@/constants/layout';
import type { UserPhoto } from '@/types/user';

function toRows(photos: UserPhoto[]) {
  const rows: UserPhoto[][] = [];
  for (let start = 0; start < photos.length; start += PHOTO_GRID_COLUMNS) {
    rows.push(photos.slice(start, start + PHOTO_GRID_COLUMNS));
  }
  return rows;
}

/**
 * Galeria do perfil: grade de `PhotoTile` em linhas de `View` (fica dentro do
 * `ScrollView` da tela, onde uma lista virtualizada aninhada não funciona).
 */
export function ProfilePhotoGrid({
  photos,
  loadFailed,
  onRetry,
  total,
  empty,
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadMoreButtonRef,
}: ProfilePhotoGridProps) {
  if (photos === null && !loadFailed) return <ProfilePhotoGridSkeleton />;

  if (photos === null) {
    return (
      <View style={styles.container}>
        <SectionEmptyState icon="circle-alert" title="Não foi possível carregar as fotos" text="Tente de novo." />
        <Button label="Tentar de novo" variant="Tertiary" size="MD" onPress={onRetry} />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState context="Photos" title={empty.title} text={empty.text} />
      </View>
    );
  }

  const labelTotal = Math.max(total, photos.length);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {toRows(photos).map((row, rowIndex) => (
          <View key={row[0].photo_id} style={styles.row}>
            {row.map((photo, columnIndex) => (
              <PhotoTile
                key={photo.photo_id}
                uri={photo.photo_url}
                accessibilityLabel={`Foto ${rowIndex * PHOTO_GRID_COLUMNS + columnIndex + 1} de ${labelTotal}, ${photo.event.title}`}
                style={styles.tile}
              />
            ))}
            {/* A última linha incompleta: sem as caixas vazias, os tiles se esticariam. */}
            {Array.from({ length: PHOTO_GRID_COLUMNS - row.length }, (_, index) => (
              <View key={`vazio-${index}`} style={styles.tile} />
            ))}
          </View>
        ))}
      </View>
      {hasMore && (
        <Button
          ref={loadMoreButtonRef}
          label="Ver mais"
          variant="Tertiary"
          size="MD"
          isLoading={isLoadingMore}
          onPress={onLoadMore}
          style={styles.loadMore}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[12],
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
  tile: {
    flex: 1,
  },
  empty: {
    paddingTop: spacing[16],
  },
  loadMore: {
    alignSelf: 'center',
  },
});
