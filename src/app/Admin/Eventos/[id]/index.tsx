import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminUserRow } from '@/components/AdminUserRow';
import type { AdminUserRowProps } from '@/components/AdminUserRow';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { useToast } from '@/components/Toast';
import { TopAppBar } from '@/components/TopAppBar';
import { colors, palette } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminEvent } from '@/hooks/useAdminEvent';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useRemoveEvent } from '@/hooks/useRemoveEvent';
import type { AdminEventDetail } from '@/types/adminEvent';
import { adminEventPlace, adminEventStateNotice, adminEventWhen } from '@/utils/adminEvent';
import { adminUserName, countSupport } from '@/utils/adminUserProfile';

/** Mesma capa 16:9 da página do evento, na largura da tela. */
const COVER_ASPECT_RATIO = 16 / 9;
/** A capa tem a largura da tela; no skeleton, a altura dela num telefone de ~390. */
const COVER_SKELETON_HEIGHT = 200;
const INFO_ICON_SIZE = 20;
const MIN_TOUCH_TARGET = 44;
/** O `OfflineBanner` é absoluto: o conteúdo desce o mesmo tanto que nas outras fichas. */
const OFFLINE_BANNER_OFFSET = spacing[64];

/** Mesma altura mínima do StatCard da ficha do usuário. */
const STAT_CARD_MIN_HEIGHT =
  2 + spacing[16] * 2 + typography.overline.lineHeight + typography.h1.lineHeight + typography.bodyS.lineHeight + spacing[4] * 2;

function reportsLinkLabel(count: number): string {
  return count === 1 ? 'Ver a denúncia' : `Ver as ${count} denúncias`;
}

function openUserSheet(userId: string) {
  router.push(`/Admin/Usuarios/${encodeURIComponent(userId)}`);
}

/** Sem histórico (link direto, refresh na Web), voltar cai no Painel. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Painel');
}

function organizerRowProps(event: AdminEventDetail): AdminUserRowProps {
  const { organizer } = event;
  const base = {
    name: adminUserName(organizer),
    avatarUri: organizer.photo_url ?? undefined,
    onPress: () => openUserSheet(organizer.user_id),
  };
  // A ficha do evento não traz a data do banimento/suspensão: o resumo fica nas contagens.
  if (organizer.moderation_status === 'BANNED') {
    return { ...base, moderationStatus: 'BANNED', untilDate: '', reportCount: organizer.report_count };
  }
  if (organizer.moderation_status === 'SUSPENDED') {
    return { ...base, moderationStatus: 'SUSPENDED', untilDate: '', reportCount: organizer.report_count };
  }
  return {
    ...base,
    moderationStatus: 'ACTIVE',
    eventCount: organizer.event_count,
    reportCount: organizer.report_count,
  };
}

function EventoSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando ficha do evento"
      accessibilityState={{ busy: true }}
    >
      <Skeleton height={COVER_SKELETON_HEIGHT} radius="md" />
      <Skeleton width="70%" height={typography.h2.lineHeight} radius="full" />
      <Skeleton height={layout.adminUserRow.minHeight} radius="md" />
      <View style={styles.statRow}>
        <Skeleton height={STAT_CARD_MIN_HEIGHT} radius="md" style={styles.statCard} />
        <Skeleton height={STAT_CARD_MIN_HEIGHT} radius="md" style={styles.statCard} />
      </View>
    </View>
  );
}

type EventoContentProps = {
  event: AdminEventDetail;
  refresh: () => Promise<void>;
};

function EventoContent({ event, refresh }: EventoContentProps) {
  const { isRefreshing, onRefresh } = useRefreshable(refresh);
  const notice = adminEventStateNotice(event);
  const when = adminEventWhen(event);
  const place = adminEventPlace(event);
  const { metrics } = event;
  const description = event.description?.trim();

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
      {event.cover_photo_url ? (
        <Image
          source={{ uri: event.cover_photo_url }}
          style={styles.cover}
          contentFit="cover"
          accessibilityLabel={`Capa de ${event.title}`}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} accessible accessibilityLabel="Evento sem capa">
          <Icon name="image" size={32} color={palette.primary[400]} />
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        {event.title}
      </Text>

      {notice ? (
        <View style={[styles.notice, notice.tone === 'error' ? styles.noticeError : styles.noticeNeutral]}>
          <Icon
            name="circle-alert"
            size={16}
            color={notice.tone === 'error' ? palette.error.default : colors.text.secondary}
          />
          <Text style={[styles.noticeText, notice.tone === 'error' && styles.noticeTextError]}>{notice.text}</Text>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        {when ? (
          <View style={styles.infoRow}>
            <Icon name="calendar" size={INFO_ICON_SIZE} color={colors.text.primary} />
            <Text style={styles.infoText}>{when}</Text>
          </View>
        ) : null}
        {place ? (
          <View style={styles.infoRow}>
            <Icon name="map-pin" size={INFO_ICON_SIZE} color={colors.text.primary} />
            {/* O painel vê o endereço exato, mesmo em evento privado. */}
            <Text style={styles.infoText}>{place}</Text>
          </View>
        ) : null}
        <View style={styles.badges}>
          <Badge family="Privacy" value={event.privacy} />
        </View>
        {event.tags.length > 0 ? <Text style={styles.tags}>{event.tags.join(' · ')}</Text> : null}
      </View>

      <View style={styles.statRow}>
        <StatCard
          label="PARTICIPANTES"
          value={metrics.participant_count}
          support={countSupport(metrics.pending_count, 'pendente', 'pendentes')}
          tone="Neutral"
          style={styles.statCard}
        />
        <StatCard
          label="DENÚNCIAS"
          value={metrics.report_count}
          support={countSupport(metrics.report_upheld_count, 'procedente', 'procedentes')}
          tone={metrics.report_count > 0 ? 'Alert' : 'Neutral'}
          style={styles.statCard}
        />
      </View>

      <SectionHeader title="ORGANIZADOR" variant="overline" />
      <AdminUserRow {...organizerRowProps(event)} />

      <SectionHeader title="DESCRIÇÃO" variant="overline" />
      <Text style={description ? styles.description : styles.descriptionEmpty}>
        {description || 'Sem descrição.'}
      </Text>
    </ScrollView>
  );
}

type EventoFooterProps = {
  event: AdminEventDetail;
  isRemoving: boolean;
  onRemove: () => void;
  onViewReports: () => void;
};

/** No ar: "Remover evento". Removido: só o link para as denúncias. */
function EventoFooter({ event, isRemoving, onRemove, onViewReports }: EventoFooterProps) {
  const insets = useSafeAreaInsets();
  const reports = event.metrics.report_count;
  const isActive = event.moderation_status === 'ACTIVE';
  if (!isActive && reports === 0) return null;

  return (
    <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
      {isActive ? (
        <Button
          label="Remover evento"
          variant="Danger"
          size="LG"
          onPress={onRemove}
          disabled={isRemoving}
          accessibilityLabel={`Remover o evento ${event.title}`}
        />
      ) : null}
      {reports > 0 ? (
        <Pressable
          onPress={onViewReports}
          accessibilityRole="link"
          accessibilityLabel={`${reportsLinkLabel(reports)} contra ${event.title}`}
          hitSlop={spacing[8]}
          style={({ pressed }) => [styles.reportsLink, pressed && { opacity: pressedOpacity }]}
        >
          <Text style={styles.reportsLinkText}>{reportsLinkLabel(reports)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Ficha de moderação de um evento: aberta pelo card do evento no detalhe da
 * denúncia, no lugar da página comum do app (que esconde o endereço de evento
 * privado e mostra "Solicitar participação").
 */
export default function AdminEvento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data, isLoading, error, refetch } = useAdminEvent(eventId);
  const { removeEvent, isLoading: isRemoving } = useRemoveEvent(eventId);
  const { isOffline } = useNetworkStatus();
  const { addToast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const handleRemove = useCallback(async () => {
    const result = await removeEvent();
    setConfirming(false);
    if (result.kind === 'done') {
      addToast({ type: 'success', message: 'Evento removido. As denúncias abertas dele foram encerradas.' });
      void refetch();
      return;
    }
    addToast({ type: 'error', message: result.message });
    // 409: outra pessoa já removeu; a ficha está desatualizada.
    if (result.status === 409) void refetch();
  }, [removeEvent, addToast, refetch]);

  const handleViewReports = useCallback(() => {
    router.push({ pathname: '/Admin/Denuncias', params: { target_event_id: eventId } });
  }, [eventId]);

  const body = (() => {
    if (data) return <EventoContent event={data} refresh={refetch} />;
    if (error && !isLoading) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta={error.canRetry}
          ctaLabel="Tentar de novo"
          onCtaPress={() => {
            void refetch();
          }}
          fill
        />
      );
    }
    return <EventoSkeleton />;
  })();

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Evento" applyTopInset={false} onBack={goBack} />

      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>{body}</View>
        {isOffline && <OfflineBanner />}
      </View>

      {data && (
        <EventoFooter
          event={data}
          isRemoving={isRemoving || isOffline}
          onRemove={() => setConfirming(true)}
          onViewReports={handleViewReports}
        />
      )}

      {data && confirming && (
        <Dialog
          visible
          variant="RemoveEvent"
          title={`Remover ${data.title}?`}
          isLoading={isRemoving}
          onConfirm={() => {
            void handleRemove();
          }}
          onCancel={() => {
            if (!isRemoving) setConfirming(false);
          }}
        />
      )}
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
  content: {
    padding: spacing[16],
    gap: spacing[16],
  },
  cover: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
    borderRadius: radius.md,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary[100],
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    padding: spacing[12],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noticeError: {
    backgroundColor: palette.error.bg,
    borderColor: palette.error.border,
  },
  noticeNeutral: {
    backgroundColor: colors.bg.subtle,
    borderColor: colors.border.default,
  },
  noticeText: {
    ...typography.labelM,
    flexShrink: 1,
    color: colors.text.secondary,
  },
  noticeTextError: {
    color: palette.error.default,
  },
  infoCard: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.md,
    padding: spacing[16],
    gap: spacing[12],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  infoText: {
    ...typography.bodyL,
    flex: 1,
    color: colors.text.primary,
  },
  badges: {
    flexDirection: 'row',
  },
  tags: {
    ...typography.bodyS,
    color: colors.text.secondary,
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
  description: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  descriptionEmpty: {
    ...typography.bodyM,
    color: colors.text.tertiary,
  },
  footer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  reportsLink: {
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  reportsLinkText: {
    ...typography.labelM,
    color: colors.text.brand,
    textAlign: 'center',
  },
});
