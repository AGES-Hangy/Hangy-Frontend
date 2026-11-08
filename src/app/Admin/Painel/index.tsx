import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ReportCard } from '@/components/ReportCard';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useLogout } from '@/hooks/useLogout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import type { AdminDashboard } from '@/types/admin';
import { dashboardStats, recentReportCard } from '@/utils/adminDashboard';

/** Barra de 56 do TopAppBar, sem o `paddingTop` 12 do frame: o `Admin/_layout` já aplica a safe area. */
const HEADER_HEIGHT = 56;
/** Borda inferior do TopAppBar no Figma; a constante do componente é local. */
const HEADER_BORDER_WIDTH = 1.5;
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
/** Mesmo `numberOfLines` do trecho no ReportCard. */
const REPORT_EXCERPT_LINES = 2;
/** Como no ReportCard: o padding de 12 do Figma conta a partir da borda externa. */
const REPORT_CARD_PADDING = spacing[12] - layout.reportCard.borderWidth;

/** Larguras das barras do skeleton, em fração da largura disponível. */
const SKELETON_STAT_LABEL_WIDTH = '70%';
const SKELETON_STAT_VALUE_WIDTH = '40%';
const SKELETON_STAT_SUPPORT_WIDTH = '60%';
const SKELETON_REPORT_TITLE_WIDTH = '60%';
const SKELETON_REPORT_SUBTITLE_WIDTH = '45%';
const SKELETON_REPORT_BADGE_WIDTH = '25%';
const SKELETON_REPORT_REASON_WIDTH = '50%';
const SKELETON_REPORT_EXCERPT_LAST_LINE_WIDTH = '75%';

/**
 * Nenhuma variante do TopAppBar tem título à esquerda com uma ação de texto, e
 * todas somam `insets.top`, que o `Admin/_layout` já aplica.
 */
function PainelHeader() {
  const { logout, isLoading } = useLogout();

  return (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        Painel administrativo
      </Text>
      <Button
        label="Sair"
        variant="Tertiary"
        size="SM"
        accessibilityLabel="Sair da conta"
        isLoading={isLoading}
        onPress={logout}
        style={styles.logout}
      />
    </View>
  );
}

function ReportsSectionHeader() {
  return (
    // A fila completa é a task 260: até lá a ação aparece, mas desabilitada.
    <SectionHeader
      title="DENÚNCIAS RECENTES"
      variant="overline"
      action
      actionLabel="Ver todas"
      actionAccessibilityLabel="Ver todas as denúncias"
      actionDisabled
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

function ReportCardSkeleton() {
  const metrics = layout.reportCard;

  return (
    <View style={[styles.skeletonCard, styles.reportSkeleton]}>
      <View style={styles.reportSkeletonHeader}>
        <Skeleton width={metrics.thumbSize} height={metrics.thumbSize} radius="full" />
        <View style={styles.reportSkeletonHeaderText}>
          <Skeleton width={SKELETON_REPORT_TITLE_WIDTH} height={typography.labelM.lineHeight} radius="full" />
          <Skeleton width={SKELETON_REPORT_SUBTITLE_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
        </View>
        <Skeleton width={SKELETON_REPORT_BADGE_WIDTH} height={layout.badge.height} radius="full" />
      </View>
      <Skeleton width={SKELETON_REPORT_REASON_WIDTH} height={typography.labelS.lineHeight} radius="full" />
      <View style={styles.reportSkeletonExcerpt}>
        <Skeleton height={typography.bodyS.fontSize} radius="full" />
        <Skeleton width={SKELETON_REPORT_EXCERPT_LAST_LINE_WIDTH} height={typography.bodyS.fontSize} radius="full" />
      </View>
      {/* Sem `reportNumber`, o rodapé do card real tem só o chevron. */}
      <Skeleton
        width={metrics.chevronSize}
        height={metrics.chevronSize}
        radius="xs"
        style={styles.reportSkeletonChevron}
      />
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
        <SectionEmptyState icon="flag" title="Nenhuma denúncia na fila" text="Novas denúncias aparecem aqui." />
      ) : (
        dashboard.recent_reports.map(report => (
          <ReportCard key={report.report_id} {...recentReportCard(report)} />
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
  header: {
    // No React Native a `height` inclui a borda.
    height: HEADER_HEIGHT + HEADER_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    borderBottomWidth: HEADER_BORDER_WIDTH,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  title: {
    ...typography.h4,
    flexShrink: 1,
    color: colors.text.primary,
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
  reportSkeleton: {
    borderWidth: layout.reportCard.borderWidth,
    padding: REPORT_CARD_PADDING,
    gap: spacing[8],
  },
  reportSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  reportSkeletonHeaderText: {
    flex: 1,
    gap: layout.reportCard.titleGap,
  },
  // Duas barras da altura da fonte dentro de duas linhas de texto: o trecho real ocupa a mesma altura.
  reportSkeletonExcerpt: {
    height: typography.bodyS.lineHeight * REPORT_EXCERPT_LINES,
    justifyContent: 'space-around',
  },
  reportSkeletonChevron: {
    alignSelf: 'flex-end',
  },
});
