import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useFeed, type FeedSection } from '@/hooks/useFeed';

export default function Home() {
  const { sections, isLoading, error, isOffline, reload } = useFeed();

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorMessage}>
            <Icon name={isOffline ? 'map-pin-off' : 'circle-alert'} color={isOffline ? palette.warning.default : colors.feedback.error} size={40} />
            <Text style={styles.stateTitle}>{isOffline ? 'Você está sem internet' : 'Algo deu errado do nosso lado'}</Text>
            <Text style={styles.stateText}>{isOffline ? 'o Hangy precisa de conexão para carregar eventos e o mapa Ao vivo. Verifique o Wi-Fi ou os dados móveis.' : error}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar o feed novamente"
            onPress={() => void reload()}
            style={styles.retryButton}
          >
            <Text style={styles.retryLabel}>Tentar de novo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const visibleSections = sections.filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <EmptyState context="Home" cta ctaAtBottom onCtaPress={() => router.push('/EditInterests')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleSections}
        keyExtractor={(section) => section.tag.id}
        renderItem={({ item }) => <FeedSectionRow section={item} />}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

function FeedSectionRow({ section }: { section: FeedSection }) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title={section.tag.name}
        action={section.hasMore}
        onActionPress={() => router.push(`/SearchResults?tagId=${section.tag.id}&type=events`)}
        actionAccessibilityLabel={`Ver todos os eventos de ${section.tag.name}`}
      />
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => (
          <EventCard
            variant="Mini"
            event={item}
            onPress={() => router.push(`/EventDetail?id=${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View style={styles.container}>
      <FlatList
        data={['first', 'second', 'third']}
        keyExtractor={(item) => item}
        renderItem={() => (
          <View style={styles.section}>
            <View style={styles.skeletonHeader} />
            <View style={styles.skeletonRow}>
              {[0, 1].map((item) => <View key={item} style={styles.skeletonCard} />)}
            </View>
          </View>
        )}
        contentContainerStyle={styles.feedContent}
      />
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
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  errorMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
    maxWidth: 320,
  },
  stateTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  stateText: {
    ...typography.bodyM,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[16],
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
  },
  retryLabel: {
    ...typography.labelM,
    color: colors.text.inverse,
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
