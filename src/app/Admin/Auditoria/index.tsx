import { router } from 'expo-router';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { TopAppBar } from '@/components/TopAppBar';
import { AUDIT_ACTION_ICONS, UNKNOWN_AUDIT_ACTION_ICON } from '@/constants/auditActions';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminAuditLog } from '@/hooks/useAdminAuditLog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import type { AuditAction, AuditLogItem } from '@/types/admin';
import { groupAuditLog } from '@/utils/adminAuditLog';
import { formatTime } from '@/utils/datetime';

/** Ícone de 18 do frame, alinhado à primeira linha do resumo (Label M, 18 de altura). */
const ROW_ICON_SIZE = 18;
/** Gap de 2 entre resumo e horário no Figma: abaixo da grade de 4, sem token. */
const ROW_TEXT_GAP = 2;
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto que no Painel para o primeiro registro não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

/** Células do primeiro lote da lista: o bastante para encher uma tela alta. */
const INITIAL_CELLS = 30;
/** Altura do SectionHeader no Figma; o componente não exporta a constante. */
const SECTION_HEADER_HEIGHT = 44;
/** Como no frame: um grupo com três registros. */
const SKELETON_ROW_COUNT = 3;
const SKELETON_SECTION_WIDTH = '15%';
const SKELETON_SUMMARY_WIDTH = '75%';
const SKELETON_TIME_WIDTH = '30%';

function iconFor(action: AuditLogItem['action']) {
  return Object.prototype.hasOwnProperty.call(AUDIT_ACTION_ICONS, action)
    ? AUDIT_ACTION_ICONS[action as AuditAction]
    : UNKNOWN_AUDIT_ACTION_ICON;
}

/** Sem voltar no histórico (deep link, recarga na web), volta para o Painel, e não para a Home do app. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Painel');
}

/** Somente leitura: o registro não é tocável, só lido inteiro pelo leitor de tela. */
function AuditRow({ item }: { item: AuditLogItem }) {
  const { icon, color } = iconFor(item.action);
  const time = formatTime(item.created_at);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={time ? `${item.summary}, às ${time}` : item.summary}
    >
      <Icon name={icon} size={ROW_ICON_SIZE} color={color} absoluteStrokeWidth />
      <View style={styles.rowText}>
        <Text style={styles.summary}>{item.summary}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

function AuditSkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={ROW_ICON_SIZE} height={ROW_ICON_SIZE} radius="full" />
      <View style={styles.rowText}>
        <Skeleton width={SKELETON_SUMMARY_WIDTH} height={typography.labelM.lineHeight} radius="full" />
        <Skeleton width={SKELETON_TIME_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
      </View>
    </View>
  );
}

/** O container anuncia o carregamento uma vez; as barras não têm o que ler. */
function AuditSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando auditoria"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.skeletonSectionHeader}>
        <Skeleton width={SKELETON_SECTION_WIDTH} height={typography.overline.lineHeight} radius="full" />
      </View>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <AuditSkeletonRow key={index} />
      ))}
    </View>
  );
}

type AuditListProps = {
  items: AuditLogItem[];
  refresh: () => Promise<void>;
};

function AuditList({ items, refresh }: AuditListProps) {
  const { isRefreshing, onRefresh } = useRefreshable(refresh);
  const insets = useSafeAreaInsets();
  const sections = groupAuditLog(items);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.audit_log_id}
      renderItem={({ item }) => <AuditRow item={item} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <SectionHeader title={section.title} variant="overline" />
        </View>
      )}
      stickySectionHeadersEnabled={false}
      // O lote padrão (10) conta cabeçalho e rodapé de cada seção: com poucos
      // grupos, o último cabeçalho aparecia sozinho antes do próximo lote.
      initialNumToRender={INITIAL_CELLS}
      // Sem a AdminNav por baixo, a lista é quem respeita o indicador de home.
      contentContainerStyle={[styles.content, { paddingBottom: spacing[16] + insets.bottom }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.action.primary}
          colors={[colors.action.primary]}
        />
      }
    />
  );
}

export default function AdminAuditoria() {
  const { data, error, refetch } = useAdminAuditLog();
  const { isOffline } = useNetworkStatus();

  const content = (() => {
    if (data && data.length > 0) return <AuditList items={data} refresh={refetch} />;

    if (data) {
      return (
        <EmptyState
          context="Search"
          icon="clock"
          title="Nenhuma ação registrada ainda"
          text="As ações dos administradores aparecem aqui."
          fill
        />
      );
    }

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

    return <AuditSkeleton />;
  })();

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Auditoria" onBack={goBack} />
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
  body: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  // Frame: padding 16 em cima e dos lados.
  content: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
  },
  // Gap de 12 do frame entre cabeçalhos e registros. A SectionList não aplica
  // `gap` entre células com segurança, então cada uma leva o espaço embaixo.
  sectionHeader: {
    marginBottom: spacing[12],
  },
  skeletonSectionHeader: {
    height: SECTION_HEADER_HEIGHT,
    justifyContent: 'center',
    marginBottom: spacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    marginBottom: spacing[12],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: ROW_TEXT_GAP,
  },
  summary: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  time: {
    ...typography.bodyS,
    color: colors.text.tertiary,
  },
});
