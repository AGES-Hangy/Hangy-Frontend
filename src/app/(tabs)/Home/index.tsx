import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorScreen } from '@/components/ErrorScreen';
import { EventCard } from '@/components/EventCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { Event } from '@/components/EventCard/types';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFavoriteEvent } from '@/hooks/useFavoriteEvent';
import { useFeed, type FeedSection } from '@/hooks/useFeed';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useRetryOnReconnect } from '@/hooks/useRetryOnReconnect';
import { loadErrorScreenProps } from '@/utils/errorScreen';

export default function Home() {
  const { sections, isLoading, error, reload, refresh } = useFeed();
  const { isRefreshing, onRefresh } = useRefreshable(refresh);
  const { user } = useCurrentUser();
  // Reconectou: refaz a carga que falhou, sem o usuário tocar em nada.
  const { isOffline } = useRetryOnReconnect(Boolean(error?.canRetry), reload);
  // O feed só traz eventos publicados, então basta o tipo da conta.
  const canFavorite = user?.userType === 'PERSONAL';

  if (isLoading) {
    return <FeedSkeleton offline={isOffline} />;
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <ErrorScreen
          {...loadErrorScreenProps(error, {
            onRetry: () => void reload(),
            retryAccessibilityLabel: 'Tentar carregar o feed novamente',
          })}
        />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  const visibleSections = sections.filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <View style={[styles.stateContainer, isOffline && styles.contentBelowBanner]}>
        <EmptyState context="Home" cta ctaAtBottom ctaDisabled />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleSections}
        keyExtractor={(section) => section.tag.id}
        renderItem={({ item }) => (
          <FeedSectionRow section={item} canFavorite={canFavorite} onEventUnavailable={refresh} />
        )}
        contentContainerStyle={[styles.feedContent, isOffline && styles.contentBelowBanner]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.action.primary}
            colors={[colors.action.primary]}
          />
        }
      />
      {isOffline && <OfflineBanner />}
    </View>
  );
}

function FeedSectionRow({
  section,
  canFavorite,
  onEventUnavailable,
}: {
  section: FeedSection;
  canFavorite: boolean;
  onEventUnavailable: () => void;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title={section.tag.name}
        action={section.hasMore}
        actionDisabled
        actionAccessibilityLabel={`Ver todos os eventos de ${section.tag.name}`}
      />
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => (
          <FeedEventCard event={item} canFavorite={canFavorite} onUnavailable={onEventUnavailable} />
        )}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

/** Um card por hook: cada estrela tem o próprio estado e a própria requisição. */
function FeedEventCard({
  event,
  canFavorite,
  onUnavailable,
}: {
  event: Event;
  canFavorite: boolean;
  onUnavailable: () => void;
}) {
  const { isFavorited, toggle } = useFavoriteEvent(event.id, event.isFavorited ?? false, {
    eventTitle: event.title,
    // Evento cancelado ou apagado desde a carga: recarrega para tirá-lo do feed.
    onUnavailable,
  });

  return (
    <EventCard
      variant="Mini"
      event={event}
      onPress={() => router.push(`/EventDetail?id=${event.id}`)}
      isFavorited={isFavorited}
      onFavoritePress={canFavorite ? toggle : undefined}
    />
  );
}

function FeedSkeleton({ offline }: { offline: boolean }) {
  return (
    <View style={styles.container}>
      <View
        style={[styles.feedContent, offline && styles.contentBelowBanner]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Carregando eventos"
      >
        {['first', 'second', 'third'].map((key) => (
          <View key={key} style={styles.section}>
            <View style={styles.skeletonHeader} />
            <View style={styles.skeletonRow}>
              {[0, 1].map((item) => <View key={item} style={styles.skeletonCard} />)}
            </View>
          </View>
        ))}
      </View>
      {offline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  // O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce
  // o mesmo respiro das outras telas para a faixa não cobrir a primeira seção.
  contentBelowBanner: {
    paddingTop: spacing[64],
  },
  feedContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
  },
  section: {
    marginBottom: spacing[8],
  },
  cardSeparator: {
    width: spacing[12],
  },
  skeletonHeader: {
    width: '42%',
    height: typography.h3.lineHeight,
    marginVertical: spacing[12],
    borderRadius: radius.sm,
    backgroundColor: colors.surface.sunken,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  skeletonCard: {
    width: layout.eventCard.miniWidth,
    height: layout.eventCard.miniHeight,
    borderRadius: radius.md,
    backgroundColor: colors.surface.sunken,
  },
});