import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminUserRow } from '@/components/AdminUserRow';
import type { AdminUserRowProps } from '@/components/AdminUserRow';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import type { DialogVariant } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { TopAppBar } from '@/components/TopAppBar';
import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminReport } from '@/hooks/useAdminReport';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SUSPENSION_DAYS, useReportModeration } from '@/hooks/useReportModeration';
import type { ReportModerationAction } from '@/hooks/useReportModeration';
import type { AdminReportDetail, ReportResolutionAction } from '@/types/adminReport';
import { formatDayMonth } from '@/utils/datetime';
import {
  formatShortDateTime,
  isReportOpen,
  previousReportsSummary,
  reportReasonLabel,
  reportStateLine,
  resolutionCopy,
  shortName,
  targetSummary,
} from '@/utils/adminReport';

const metrics = layout.adminReport;

const DIALOG_VARIANT: Record<ReportModerationAction, DialogVariant> = {
  BAN: 'BanUser',
  SUSPEND: 'SuspendUser',
  ARCHIVE: 'ArchiveReport',
  REMOVE_EVENT: 'RemoveEvent',
};

const RESOLUTION_ACTION: Record<ReportModerationAction, ReportResolutionAction> = {
  BAN: 'BANNED',
  SUSPEND: 'SUSPENDED',
  ARCHIVE: 'ARCHIVED',
  REMOVE_EVENT: 'EVENT_REMOVED',
};

function targetName(report: AdminReportDetail) {
  return report.target.name?.trim() || 'Conta removida';
}

/** O evento denunciado, quando ainda está no ar: libera "Remover evento". */
function removableEvent(report: AdminReportDetail) {
  return report.target.type === 'EVENT' && report.event?.moderation_status === 'ACTIVE' ? report.event : null;
}

/** Sem histórico (link direto, refresh na Web), voltar cai no Painel, não na área comum. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Painel');
}

/**
 * Props do `AdminUserRow` para a conta denunciada. O `summary` traz o texto do
 * frame do detalhe; as contagens exigidas por cada status ficam como dado real
 * (a denúncia aberta conta como uma das denúncias da conta).
 */
function targetRowProps(report: AdminReportDetail): AdminUserRowProps {
  const base = {
    name: targetName(report),
    summary: targetSummary(report),
    avatarUri: report.organizer?.photo_url ?? undefined,
  };
  const { moderation_status: status, event_count: eventCount } = report.target;
  const reportCount = report.previous_reports.total + 1;
  // O `summary` substitui o texto montado com `untilDate`; mesmo assim, a data
  // só vai quando tem o significado da prop: "banido em" é a data da resolução
  // que baniu. O detalhe não traz o fim da suspensão, então ela fica vazia.
  if (status === 'BANNED') {
    const bannedOn = report.resolution?.action === 'BANNED' ? formatDayMonth(report.resolution.resolved_at) : '';
    return { ...base, moderationStatus: 'BANNED', untilDate: bannedOn, reportCount };
  }
  if (status === 'SUSPENDED') return { ...base, moderationStatus: 'SUSPENDED', untilDate: '', reportCount };
  return { ...base, moderationStatus: 'ACTIVE', eventCount };
}

function dialogTitle(action: ReportModerationAction, report: AdminReportDetail) {
  if (action === 'BAN') return `Banir ${targetName(report)}?`;
  if (action === 'SUSPEND') return `Suspender ${targetName(report)}?`;
  if (action === 'REMOVE_EVENT' && report.event) return `Remover ${report.event.title}?`;
  return undefined;
}

function successMessage(action: ReportModerationAction, report: AdminReportDetail) {
  const closed = `Denúncia #${report.report_number} encerrada.`;
  if (action === 'BAN') return `${targetName(report)} foi banido. ${closed}`;
  if (action === 'SUSPEND') return `${targetName(report)} foi suspenso por ${SUSPENSION_DAYS} dias. ${closed}`;
  if (action === 'REMOVE_EVENT') return `Evento removido. ${closed}`;
  return `Denúncia #${report.report_number} arquivada.`;
}

function LoadingSkeleton() {
  return (
    <View style={styles.content} accessibilityLabel="Carregando denúncia" accessible>
      <Skeleton width="45%" height={layout.badge.height} radius="full" />
      <Skeleton width="40%" height={typography.overline.lineHeight} style={styles.skeletonHeader} />
      <Skeleton height={layout.adminUserRow.minHeight} radius="md" />
      <Skeleton width="25%" height={typography.overline.lineHeight} style={styles.skeletonHeader} />
      <Skeleton width="60%" height={typography.labelM.lineHeight} />
      <Skeleton width="50%" height={typography.overline.lineHeight} style={styles.skeletonHeader} />
      <Skeleton height={metrics.statementSkeletonHeight} radius="md" />
    </View>
  );
}

/**
 * Detalhe de uma denúncia no painel administrativo, com as três ações de
 * moderação. Depois de qualquer ação a tela não navega: troca de estado no
 * lugar (Aberta → Resolvida), com a conta já no status novo.
 */
export default function AdminReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { report, isLoading, error, reload, patchReport } = useAdminReport(id);
  // Com a denúncia na tela, `isLoading` é o recarregamento depois de um conflito
  // e `error` é a falha dele: o que está na tela pode estar desatualizado.
  const isRefreshing = report !== null && isLoading;
  const refreshFailed = report !== null && !isLoading && error !== null;

  const { ban, suspend, archive, removeEvent, pendingAction } = useReportModeration();
  const { user } = useCurrentUser();
  const { addToast } = useToast();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<ReportModerationAction | null>(null);
  const actionsLocked = pendingAction !== null || isRefreshing;

  const title = report ? `Denúncia #${report.report_number}` : 'Denúncia';

  async function confirmAction() {
    if (!report || !dialog) return;
    const action = dialog;

    const event = removableEvent(report);
    if (action === 'REMOVE_EVENT' && !event) return;

    const result =
      action === 'BAN'
        ? await ban(report.target.id, report.report_id)
        : action === 'SUSPEND'
          ? await suspend(report.target.id, report.report_id)
          : action === 'REMOVE_EVENT' && event
            ? await removeEvent(event.id, report.report_id)
            : await archive(report.report_id);

    if (result.status === 'ignored') return;
    setDialog(null);

    // Outra pessoa já resolveu, ou a conta mudou: o que está na tela não vale mais.
    if (result.status === 'stale') {
      const refreshed = await reload();
      if (!refreshed) addToast({ type: 'error', message: 'Não foi possível atualizar a denúncia.' });
      return;
    }
    if (result.status !== 'done') return;

    patchReport({
      status: action === 'ARCHIVE' ? 'REJECTED' : 'RESOLVED',
      moderationStatus: result.moderationStatus,
      ...(action === 'REMOVE_EVENT' && report.event
        ? { event: { ...report.event, moderation_status: 'REMOVED' } }
        : {}),
      resolution: {
        resolved_by: { id: user?.userId ?? '', name: user?.name ?? null },
        resolved_at: new Date().toISOString(),
        action: RESOLUTION_ACTION[action],
      },
    });
    addToast({ type: 'success', message: successMessage(action, report) });
  }

  function renderBody() {
    if (!report) {
      if (isLoading || !error) return <LoadingSkeleton />;
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta={error.canRetry}
          ctaLabel="Tentar de novo"
          onCtaPress={() => {
            void reload();
          }}
          fill
        />
      );
    }

    const open = isReportOpen(report.status);
    const resolution = resolutionCopy(report);
    const event = removableEvent(report);

    return (
      <>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.state}>
            <Badge family="Moderation" value={report.status} />
            <Text style={[typography.bodyS, styles.stateText]} numberOfLines={1}>
              {reportStateLine(report)}
            </Text>
          </View>

          {report.target.type === 'EVENT' && report.event ? (
            <>
              <SectionHeader title="EVENTO DENUNCIADO" variant="overline" />
              <View
                style={styles.event}
                accessible
                accessibilityLabel={`Evento ${report.event.title}${report.event.moderation_status === 'REMOVED' ? ', removido' : ''}`}
              >
                <Icon name="calendar" size={metrics.reasonIconSize} color={colors.text.secondary} />
                <Text style={[typography.labelM, styles.eventTitle]} numberOfLines={2}>
                  {report.event.title}
                </Text>
                {report.event.moderation_status === 'REMOVED' ? (
                  <Text style={[typography.bodyS, styles.eventRemoved]}>Removido</Text>
                ) : null}
              </View>
            </>
          ) : null}

          <SectionHeader
            title={report.target.type === 'EVENT' ? 'ORGANIZADOR DO EVENTO DENUNCIADO' : 'CONTA DENUNCIADA'}
            variant="overline"
          />
          <AdminUserRow {...targetRowProps(report)} />

          <SectionHeader title="MOTIVO" variant="overline" />
          <View style={styles.reason}>
            <Icon name="flag" size={metrics.reasonIconSize} color={palette.error.default} />
            <Text style={[typography.labelM, styles.reasonText]}>{reportReasonLabel(report.reason)}</Text>
          </View>

          <SectionHeader title="RELATO DE QUEM DENUNCIOU" variant="overline" />
          <View style={styles.statement}>
            <Text style={[typography.bodyM, styles.statementText]}>{`“${report.description}”`}</Text>
            <Text style={[typography.bodyS, styles.statementMeta]}>
              {`Denunciado por ${shortName(report.reported_by.name)} · ${formatShortDateTime(report.reported_at)}`}
            </Text>
          </View>

          <SectionHeader title="HISTÓRICO DA CONTA" variant="overline" />
          <Text style={[typography.bodyM, styles.history]}>{previousReportsSummary(report)}</Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
          {refreshFailed ? (
            <View style={styles.outdated}>
              <Text style={[typography.bodyS, styles.outdatedText]}>
                {`Não foi possível atualizar esta denúncia. ${error?.message ?? ''}`.trim()}
              </Text>
              <Button
                label="Tentar de novo"
                variant="Tertiary"
                size="SM"
                onPress={() => {
                  void reload();
                }}
                style={styles.secondaryAction}
              />
            </View>
          ) : open ? (
            <>
              {event ? (
                <Button
                  label="Remover evento"
                  variant="Danger"
                  size="LG"
                  onPress={() => setDialog('REMOVE_EVENT')}
                  disabled={actionsLocked}
                  accessibilityLabel={`Remover o evento ${event.title}`}
                />
              ) : null}
              <View style={styles.mainActions}>
                <Button
                  label="Banir usuário"
                  // Em denúncia de evento, remover é a ação principal; banir o
                  // organizador continua disponível, sem competir com ela.
                  variant={event ? 'Secondary' : 'Danger'}
                  size="LG"
                  onPress={() => setDialog('BAN')}
                  disabled={actionsLocked}
                  accessibilityLabel={`Banir ${targetName(report)}`}
                  style={styles.mainAction}
                />
                <Button
                  label={`Suspender ${SUSPENSION_DAYS} dias`}
                  variant="Secondary"
                  size="LG"
                  onPress={() => setDialog('SUSPEND')}
                  disabled={actionsLocked}
                  accessibilityLabel={`Suspender ${targetName(report)} por ${SUSPENSION_DAYS} dias`}
                  style={styles.mainAction}
                />
              </View>
              <Button
                label="Arquivar denúncia"
                variant="Tertiary"
                size="SM"
                onPress={() => setDialog('ARCHIVE')}
                disabled={actionsLocked}
                accessibilityLabel={`Arquivar a denúncia #${report.report_number} sem ação na conta`}
                style={styles.secondaryAction}
              />
            </>
          ) : (
            <View
              style={styles.resolution}
              accessible
              accessibilityLabel={`${resolution.title}. ${resolution.text}`}
            >
              <View style={styles.resolutionHeader}>
                <Icon name="circle-check" size={metrics.resolutionIconSize} color={palette.success.default} />
                <Text style={[typography.labelM, styles.resolutionTitle]}>{resolution.title}</Text>
              </View>
              <Text style={[typography.bodyS, styles.resolutionText]}>{resolution.text}</Text>
            </View>
          )}
        </View>

        {dialog && (
          <Dialog
            visible
            variant={DIALOG_VARIANT[dialog]}
            title={dialogTitle(dialog, report)}
            isLoading={pendingAction === dialog}
            onConfirm={() => {
              void confirmAction();
            }}
            onCancel={() => {
              if (pendingAction === null) setDialog(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title={title} applyTopInset={false} onBack={goBack} />
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing[12],
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
  },
  skeletonHeader: {
    marginTop: spacing[16],
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  stateText: {
    flexShrink: 1,
    color: colors.text.tertiary,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  eventTitle: {
    flexShrink: 1,
    color: colors.text.primary,
  },
  eventRemoved: {
    color: palette.error.default,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  reasonText: {
    flexShrink: 1,
    color: palette.error.default,
  },
  statement: {
    gap: spacing[4],
    padding: spacing[12] - metrics.borderWidth,
    borderWidth: metrics.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.subtle,
  },
  statementText: {
    color: colors.text.secondary,
  },
  statementMeta: {
    color: colors.text.tertiary,
  },
  history: {
    color: colors.text.secondary,
  },
  footer: {
    gap: spacing[8],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
  },
  mainActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  mainAction: {
    flex: 1,
    minWidth: 0,
  },
  secondaryAction: {
    alignSelf: 'center',
  },
  outdated: {
    gap: spacing[8],
  },
  outdatedText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  resolution: {
    gap: spacing[4],
    padding: spacing[12] - metrics.borderWidth,
    borderWidth: metrics.borderWidth,
    borderColor: palette.success.border,
    borderRadius: radius.md,
    backgroundColor: palette.success.bg,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  resolutionTitle: {
    flexShrink: 1,
    color: palette.success.default,
  },
  resolutionText: {
    color: colors.text.secondary,
  },
});
