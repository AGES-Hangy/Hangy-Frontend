import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AdminHeader } from '@/components/AdminHeader';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ReportCard } from '@/components/ReportCard';
import { ReportCardSkeleton } from '@/components/ReportCardSkeleton';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useAdminReports } from '@/hooks/useAdminReports';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import {
  REPORT_QUEUE_SEARCH_MAX_LENGTH,
  REPORT_QUEUE_TABS,
  reportQueueCard,
  reportQueueEmptyCopy,
  reportQueueTargetLabel,
} from '@/utils/adminReportQueue';
import type { ReportQueueTab } from '@/utils/adminReportQueue';

/** Três cards, como no frame. */
const SKELETON_CARD_COUNT = 3;
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto que no Painel para a busca não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

function CardSeparator() {
  return <View style={styles.separator} />;
}

function QueueSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando denúncias"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <ReportCardSkeleton key={index} showReportNumber />
      ))}
    </View>
  );
}

/**
 * Fila de denúncias do painel: perfis e eventos juntos, por aba de status.
 *
 * `target_user_id` (vindo da ficha do usuário, task 263) ou `target_event_id`
 * restringem a fila àquele alvo, e o chip no topo limpa o filtro.
 */
export default function AdminDenuncias() {
  const params = useLocalSearchParams<{ target_user_id?: string; target_event_id?: string }>();
  const targetUserId = params.target_user_id?.trim() || null;
  const targetEventId = targetUserId ? null : params.target_event_id?.trim() || null;
  const [tab, setTab] = useState<ReportQueueTab>('PENDING');
  const [searchText, setSearchText] = useState('');
  const { isOffline } = useNetworkStatus();
  const queue = useAdminReports({ status: tab, searchText, targetUserId, targetEventId });
  const { isRefreshing, onRefresh } = useRefreshable(queue.refresh);

  const clearTargetFilter = () => router.setParams({ target_user_id: undefined, target_event_id: undefined });
  const targetLabel = reportQueueTargetLabel({ targetName: queue.targetName, targetUserId, targetEventId });
  const emptyCopy = reportQueueEmptyCopy({ tab, search: queue.activeSearch, isTargeted: targetLabel !== null });

  const content = (() => {
    if (queue.error) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={queue.error.title}
          text={queue.error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={() => {
            void queue.reload();
          }}
          fill
        />
      );
    }

    if (queue.isLoading) return <QueueSkeleton />;

    return (
      <FlatList
        data={queue.items}
        keyExtractor={(item) => item.report_id}
        renderItem={({ item }) => (
          <ReportCard
            {...reportQueueCard(item)}
            onPress={() => router.push(`/Admin/Denuncias/${item.report_id}`)}
          />
        )}
        ItemSeparatorComponent={CardSeparator}
        ListEmptyComponent={<EmptyState context="Search" title={emptyCopy.title} text={emptyCopy.text} fill />}
        ListFooterComponent={
          queue.isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais denúncias" />
            </View>
          ) : undefined
        }
        onEndReached={
          queue.hasMore
            ? () => {
                void queue.loadMore();
              }
            : undefined
        }
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.action.primary}
            colors={[colors.action.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
      />
    );
  })();

  return (
    <View style={styles.screen}>
      <AdminHeader title="Denúncias" />
      {/* O banner é absoluto: dentro deste container ele fica abaixo do header, e não sobre ele. */}
      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>
          <View style={styles.controls}>
            <TextField
              type="Search"
              label="Buscar denúncia"
              placeholder="Nome, evento ou nº da denúncia"
              value={searchText}
              onChangeText={setSearchText}
              maxLength={REPORT_QUEUE_SEARCH_MAX_LENGTH}
              autoCapitalize="none"
            />
            <ProfileTabs
              items={REPORT_QUEUE_TABS}
              value={tab}
              onChange={setTab}
              variant="listHeader"
              accessibilityLabel="Status das denúncias"
            />
            {targetLabel && (
              <Chip
                label={targetLabel}
                categoryType="micro"
                isSelected
                showRemoveIcon
                // O chip inteiro limpa o filtro: o X sozinho teria menos de 44 de área.
                onPress={clearTargetFilter}
                onRemove={clearTargetFilter}
                accessibilityLabel={`Limpar filtro: ${targetLabel}`}
              />
            )}
          </View>
          <View style={styles.body} accessibilityState={{ busy: queue.isSearching }}>
            {content}
          </View>
        </View>
        {isOffline && <OfflineBanner />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  body: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  controls: {
    gap: spacing[12],
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
  },
  skeleton: {
    gap: spacing[12],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
  },
  listContent: {
    flexGrow: 1,
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  separator: {
    height: spacing[12],
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
});
