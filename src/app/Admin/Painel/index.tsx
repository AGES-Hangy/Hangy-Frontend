import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AdminHeader } from '@/components/AdminHeader';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ReportCard } from '@/components/ReportCard';
import { ReportCardSkeleton } from '@/components/ReportCardSkeleton';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useLogout } from '@/hooks/useLogout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import type { AdminDashboard } from '@/types/admin';
import { dashboardStats, recentReportCard } from '@/utils/adminDashboard';

/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto que em `BlockedUsers` para o primeiro card não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

/** Grade 2x2 das métricas, como no frame. */
const STAT_ROWS = 2;
const STATS_PER_ROW = 2;
/** Borda do StatCard no Figma; o componente usa o valor direto e não exporta. */
const STAT_CARD_BORDER_WIDTH = 1;
/** Altura do StatCard com apoio. Fixa o mínimo para a grade não mudar com os dados nem ao sair do skeleton. */
const STAT_CARD_MIN_HEIGHT =
  STAT_CARD_BORDER_WIDTH * 2 +
  spacing[16] * 2 +
  typography.overline.lineHeight +
  typography.h1.lineHeight +
  typography.bodyS.lineHeight +
  spacing[4] * 2;
/** Dois cards, como no frame; o backend devolve até 5. */
const SKELETON_REPORT_COUNT = 2;

/** Larguras das barras do skeleton, em fração da largura disponível. */
const SKELETON_STAT_LABEL_WIDTH = '70%';
const SKELETON_STAT_VALUE_WIDTH = '40%';
const SKELETON_STAT_SUPPORT_WIDTH = '60%';

function PainelHeader() {
  const { logout, isLoading } = useLogout();

  return (
    <AdminHeader title="Painel administrativo">
      <Button
        label="Sair"
        variant="Tertiary"
        size="SM"
        accessibilityLabel="Sair da conta"
        isLoading={isLoading}
        onPress={logout}
        style={styles.logout}
      />
    </AdminHeader>
  );
}

function ReportsSectionHeader() {
  return (
    // `replace`, como a `AdminNav`: Painel e Denúncias são seções irmãs, não uma pilha.
    <SectionHeader
      title="DENÚNCIAS RECENTES"
      variant="overline"
      action
      actionLabel="Ver todas"
      actionAccessibilityLabel="Ver todas as denúncias"
      onActionPress={() => router.replace('/Admin/Denuncias')}
    />
  );
}

function StatCardSkeleton() {
  return (
    <View style={[styles.skeletonCard, styles.statSkeleton]}>
      <Skeleton width={SKELETON_STAT_LABEL_WIDTH} height={typography.overline.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_VALUE_WIDTH} height={typography.h1.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_SUPPORT_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
    </View>
  );
}

/**
 * Molduras na métrica de cada card, como o skeleton da Busca no Figma. O
 * container anuncia o carregamento uma vez; o SectionHeader fica dentro dele.
 */
function PainelSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando painel administrativo"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: STAT_ROWS }, (_, row) => (
        <View key={row} style={styles.statRow}>
          {Array.from({ length: STATS_PER_ROW }, (_, column) => (
            <StatCardSkeleton key={column} />
          ))}
        </View>
      ))}
      <ReportsSectionHeader />
      {Array.from({ length: SKELETON_REPORT_COUNT }, (_, index) => (
        <ReportCardSkeleton key={index} />
      ))}
    </View>
  );
}

type PainelContentProps = {
  dashboard: AdminDashboard;
  refresh: () => Promise<void>;
};

function PainelContent({ dashboard, refresh }: PainelContentProps) {
  const { isRefreshing, onRefresh } = useRefreshable(refresh);
  const stats = dashboardStats(dashboard);
  const rowCount = Math.ceil(stats.length / STATS_PER_ROW);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.action.primary}
          colors={[colors.action.primary]}
        />
      }
    >
      {Array.from({ length: rowCount }, (_, row) => (
        <View key={row} style={styles.statRow}>
          {stats.slice(row * STATS_PER_ROW, (row + 1) * STATS_PER_ROW).map(({ key, ...stat }) => (
            <StatCard key={key} {...stat} style={styles.statCard} />
          ))}
        </View>
      ))}
      <ReportsSectionHeader />
      {dashboard.recent_reports.length === 0 ? (
        <SectionEmptyState icon="flag" title="Nenhuma denúncia pendente" text="Novas denúncias aparecem aqui." />
      ) : (
        dashboard.recent_reports.map(report => (
          <ReportCard
            key={report.report_id}
            {...recentReportCard(report)}
            onPress={() => router.push(`/Admin/Denuncias/${report.report_id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}

export default function AdminPainel() {
  const { data, error, refetch } = useAdminDashboard();
  const { isOffline } = useNetworkStatus();

  const content = (() => {
    if (data) return <PainelContent dashboard={data} refresh={refetch} />;

    if (error) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={() => { void refetch(); }}
          fill
        />
      );
    }

    return <PainelSkeleton />;
  })();

  return (
    <View style={styles.screen}>
      <PainelHeader />
      {/* O banner é absoluto: dentro deste container ele fica abaixo do header, e não sobre ele. */}
      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>{content}</View>
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
  // O texto do Tertiary fica rente à margem de 16, como o título; o padding segue como área de toque.
  logout: {
    marginRight: -spacing[16],
  },
  body: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  content: {
    padding: spacing[16],
    gap: spacing[16],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[12],
  },
  statCard: {
    flex: 1,
    minHeight: STAT_CARD_MIN_HEIGHT,
  },
  skeletonCard: {
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.base,
  },
  statSkeleton: {
    flex: 1,
    minHeight: STAT_CARD_MIN_HEIGHT,
    borderWidth: STAT_CARD_BORDER_WIDTH,
    padding: spacing[16],
    gap: spacing[4],
  },
});
