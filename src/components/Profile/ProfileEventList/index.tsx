import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import type { ProfileEventListProps } from '@/components/Profile/ProfileEventList/types';
import { ProfileEventListSkeleton } from '@/components/Profile/ProfileEventListSkeleton';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { spacing } from '@/constants/layout';
import type { UserEventItem } from '@/types/user';

function toEventCardEvent(item: UserEventItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
  };
}

/** Lista de eventos da aba ativa de um perfil, com o "Ver mais" da paginação. */
export function ProfileEventList({
  items,
  loadFailed,
  onRetry,
  empty,
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadMoreButtonRef,
  cardState,
}: ProfileEventListProps) {
  if (items === null && !loadFailed) return <ProfileEventListSkeleton />;

  return (
    <View style={styles.list}>
      {items === null ? (
        <View style={styles.sectionError}>
          <SectionEmptyState icon="circle-alert" title="Não foi possível carregar os eventos" text="Tente de novo." />
          <Button label="Tentar de novo" variant="Tertiary" size="MD" onPress={onRetry} />
        </View>
      ) : items.length === 0 ? (
        <SectionEmptyState icon="calendar-x" title={empty.title} text={empty.text} />
      ) : (
        <>
          {items.map((item) => (
            <EventCard
              key={item.event_id}
              variant="Compact"
              state={cardState}
              event={toEventCardEvent(item)}
              onPress={() => router.push(`/EventDetail?id=${item.event_id}`)}
            />
          ))}
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
  },
  sectionError: {
    gap: spacing[12],
  },
  loadMore: {
    alignSelf: 'center',
  },
});
