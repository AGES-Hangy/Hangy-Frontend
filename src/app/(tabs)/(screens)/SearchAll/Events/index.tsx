import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Skeleton } from '@/components/Skeleton';
import { colors } from '@/constants/colors';
import { layout, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSearchEvents } from '@/hooks/useSearchEvents';
import type { SearchEventItem } from '@/hooks/useSearchEvents';
import { useTopAppBar } from '@/hooks/useTopAppBar';

/** Linhas do skeleton: o bastante para cobrir a primeira dobra de um celular. */
const SKELETON_ROW_COUNT = 6;
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto para o cabeçalho da lista não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

type RouteParams = {
  q?: string | string[];
  tagId?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
};

/** Parâmetro de rota pode vir como lista quando repetido; vale o primeiro. */
function firstParam(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

function toEvent(item: SearchEventItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
  };
}

function ResultsSkeleton() {
  return (
    <View
      style={styles.list}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando eventos"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <Skeleton key={index} height={layout.eventCard.compactHeight} radius="md" />
      ))}
    </View>
  );
}

/**
 * "Ver todos — eventos". Mesma tela para qualquer origem: herda o contexto
 * pela rota e não guarda filtro próprio.
 *
 * - Home: `/SearchAll/Events?tagId=<id>`
 * - Busca: `/SearchAll/Events?q=<termo>[&tagId=<id>&dateFrom=<YYYY-MM-DD>&dateTo=<YYYY-MM-DD>]`
 */
export default function SearchAllEvents() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<RouteParams>();
  const q = firstParam(params.q);
  const tagId = firstParam(params.tagId);
  const dateFrom = firstParam(params.dateFrom);
  const dateTo = firstParam(params.dateTo);

  const { isOffline } = useNetworkStatus();
  const { items, total, isLoading, isLoadingMore, error, hasMore, loadMore, retry } = useSearchEvents({
    q,
    tagIds: tagId ? [tagId] : undefined,
    dateFrom,
    dateTo,
  });

  useTopAppBar({ variant: 'BrandBack' });

  const content = (() => {
    if (isLoading && items.length === 0) return <ResultsSkeleton />;

    if (error && items.length === 0) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={retry}
          fill
        />
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={item => item.event_id}
        renderItem={({ item }) => (
          <EventCard
            variant="Compact"
            event={toEvent(item)}
            onPress={() => router.push(`/EventDetail?id=${item.event_id}`)}
          />
        )}
        ListHeaderComponent={
          total !== null && items.length > 0 ? (
            <Text style={styles.eyebrow} accessibilityRole="header">
              {`EVENTOS · ${total}`}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={<EmptyState context="Search" fill />}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais" />
            </View>
          ) : undefined
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing[24] }]}
      />
    );
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.content, isOffline && styles.contentBelowBanner]}>{content}</View>
      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
  },
  contentBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  list: {
    flexGrow: 1,
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  eyebrow: {
    ...typography.overline,
    color: colors.text.tertiary,
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
});
