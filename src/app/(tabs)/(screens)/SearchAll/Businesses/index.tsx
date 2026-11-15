import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ListItem } from '@/components/ListItem';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSearchBusinesses } from '@/hooks/useSearchBusinesses';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { BusinessSearchItem } from '@/types/search';

const METRICS = layout.listItem;
const UNNAMED_BUSINESS = 'Estabelecimento sem nome';
/** Linhas do skeleton: o bastante para cobrir a primeira dobra de um celular. */
const SKELETON_ROW_COUNT = 6;
const SKELETON_NAME_WIDTH = '55%';
const SKELETON_SUBTITLE_WIDTH = '35%';
/** Largura da linha que marca o fim da lista. */
const FOOTER_LINE_WIDTH = 32;
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto para a lista não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

function Row({ business }: { business: BusinessSearchItem }) {
  return (
    <View style={styles.rowWrapper}>
      <ListItem
        type="Business"
        name={business.business_name ?? UNNAMED_BUSINESS}
        subtitle={business.city ?? undefined}
        avatarUri={business.photo_url ?? undefined}
        onPress={() => router.push(`/UserProfile?id=${business.user_id}`)}
      />
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function BusinessesSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando estabelecimentos"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={METRICS.avatarSize} height={METRICS.avatarSize} radius="md" />
          <View style={styles.skeletonTexts}>
            <Skeleton width={SKELETON_NAME_WIDTH} height={typography.labelL.lineHeight} radius="xs" />
            <Skeleton width={SKELETON_SUBTITLE_WIDTH} height={typography.bodyS.lineHeight} radius="xs" />
          </View>
        </View>
      ))}
    </View>
  );
}

function ListFooter({ isLoadingMore, hasMore }: { isLoadingMore: boolean; hasMore: boolean }) {
  if (isLoadingMore) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais" />
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View
        style={styles.footer}
        accessible
        accessibilityRole="text"
        accessibilityLabel="Fim da lista"
      >
        <View style={styles.footerLine} />
      </View>
    );
  }
  return null;
}

export default function SearchAllBusinesses() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  // `q` vem da busca. O backend só lista estabelecimentos com termo (mín. 2 caracteres).
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { businesses, total, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useSearchBusinesses(q);

  useTopAppBar({ variant: 'BrandBack' });

  const content = (() => {
    if (isLoading && businesses.length === 0) return <BusinessesSkeleton />;

    if (error && businesses.length === 0) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={() => {
            void refresh();
          }}
          fill
        />
      );
    }

    return (
      <FlatList
        data={businesses}
        keyExtractor={(business) => business.user_id}
        renderItem={({ item }) => <Row business={item} />}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          businesses.length > 0 ? (
            <View style={styles.header}>
              <SectionHeader title={`ESTABELECIMENTOS · ${total ?? businesses.length}`} variant="overline" />
            </View>
          ) : undefined
        }
        // Mesma mensagem do bloco de origem da busca (`EmptyState` de `Search`).
        ListEmptyComponent={<EmptyState context="Search" fill />}
        ListFooterComponent={
          businesses.length > 0 ? <ListFooter isLoadingMore={isLoadingMore} hasMore={hasMore} /> : undefined
        }
        // A trava contra requisição duplicada vive em `loadMore` (ref no hook).
        onEndReached={hasMore ? () => void loadMore() : undefined}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing[24] }]}
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
  listContent: {
    flexGrow: 1,
  },
  rowWrapper: {
    paddingHorizontal: spacing[16],
  },
  header: {
    paddingHorizontal: spacing[16],
  },
  separator: {
    height: spacing[12],
  },
  skeleton: {
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  // Mesma casca do `ListItem`: borda, raio e altura mínima.
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    minHeight: METRICS.minHeight,
    padding: spacing[8],
    borderWidth: METRICS.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  skeletonTexts: {
    flex: 1,
    gap: spacing[4],
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
  footerLine: {
    width: FOOTER_LINE_WIDTH,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
});
