import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { NotificationCard, groupConnectionRequestsByPeriod } from '@/components/NotificationCard';
import { NotificationLoadError } from '@/components/NotificationLoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, palette } from '@/constants/colors';
import { elevation, layout, radius, spacing } from '@/constants/layout';
import { openNotification } from '@/constants/notificationRoutes';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNotificationLoadFeedback } from '@/hooks/useNotificationLoadFeedback';
import { useNotifications } from '@/hooks/useNotifications';
import { useTopAppBar } from '@/hooks/useTopAppBar';

/** Botão MD (44) + margem inferior de 16 + 16 de respiro acima dele. */
const FLOATING_ACTION_CLEARANCE = 44 + spacing[16] + spacing[16];

export default function Notifications() {
  // O sino não faz sentido na própria tela de notificações: seta de voltar e logo.
  useTopAppBar({ variant: 'BrandBack' });
  const {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    errorKind,
    errorScope,
    canRetryError,
    loadNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    respondToParticipationRequest,
    unreadCount,
  } = useNotifications();
  const { isOffline: networkOffline } = useNetworkStatus();
  const isOffline = networkOffline || errorKind === 'offline';
  const retryError = errorScope === 'pagination' ? loadMore : loadNotifications;
  const previousNetworkOffline = useRef(networkOffline);
  const requests = notifications.filter((item) => item.type === 'EVENT_PARTICIPATION_REQUEST');
  const connections = notifications.filter((item) => item.type === 'CONNECTION_REQUEST');
  const connectionGroups = groupConnectionRequestsByPeriod(connections);
  const activities = notifications.filter((item) =>
    item.type !== 'EVENT_PARTICIPATION_REQUEST' && item.type !== 'CONNECTION_REQUEST',
  );

  useFocusEffect(useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]));

  useNotificationLoadFeedback({ error, errorKind, errorScope, retry: retryError });

  useEffect(() => {
    const wasOffline = previousNetworkOffline.current;
    previousNetworkOffline.current = networkOffline;
    if (wasOffline && !networkOffline && errorKind === 'offline') {
      void loadNotifications();
    }
  }, [errorKind, loadNotifications, networkOffline]);

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <NotificationsSkeleton offline={isOffline} />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  if (notifications.length === 0) {
    if (error) {
      return (
        <View style={styles.container}>
          <NotificationLoadError
            message={error}
            onRetry={canRetryError && !isOffline ? () => void retryError() : undefined}
          />
          {isOffline && <OfflineBanner />}
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <EmptyState context="Notifications" fill />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          unreadCount > 0 && styles.contentWithFloatingAction,
          isOffline && styles.contentOffline,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={250}
        onScroll={({ nativeEvent }) => {
          const nearEnd = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - spacing[32];
          if (!isOffline && nearEnd && hasMore && !isLoadingMore) void loadMore();
        }}
      >
        {error && (
          <NotificationLoadError
            compact
            message={error}
            onRetry={canRetryError && !isOffline ? () => void retryError() : undefined}
          />
        )}
        <View style={styles.section}>
          <View style={styles.inset}>
            <SectionHeader
              title="SOLICITAÇÕES DE PARTICIPAÇÃO"
              variant="overline"
              action={requests.length > 0}
              onActionPress={() => router.push('/Notifications/ParticipationRequests')}
            />
          </View>
          {requests.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {requests.map((request) => (
                <NotificationCard
                  key={request.notification_id}
                  notification={request}
                  presentation="carousel"
                  onPress={() => openNotification(request, markAsRead, (href) => router.push(href), isOffline)}
                  actionsDisabled={isOffline}
                  onAccept={() => void respondToParticipationRequest(request.notification_id, 'CONFIRMED')}
                  onReject={() => void respondToParticipationRequest(request.notification_id, 'REJECTED')}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.inset}>
              <SectionEmptyState
                icon="users"
                title="Nenhuma solicitação"
                text="Quando alguém pedir para participar de um evento seu, aparece aqui."
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.inset}>
            <SectionHeader title="SOLICITAÇÕES DE CONEXÃO" variant="overline" />
          </View>
          <View style={[styles.inset, styles.list]}>
            {connectionGroups.length > 0 ? connectionGroups.map((group) => (
              <NotificationCard
                key={group.period}
                notifications={group.notifications}
                onPress={() => router.push({
                  pathname: '/Notifications/ConnectionRequests',
                  params: { period: group.period },
                })}
              />
            )) : (
              <SectionEmptyState
                icon="user"
                title="Nenhum pedido de conexão"
                text="Os pedidos de outras pessoas para se conectar com você aparecem aqui."
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.inset}>
            <SectionHeader title="SEUS EVENTOS" variant="overline" />
          </View>
          <View style={[styles.inset, styles.list]}>
            {activities.length > 0 ? activities.map((notification) => (
              <NotificationCard
                key={notification.notification_id}
                notification={notification}
                onPress={() => openNotification(notification, markAsRead, (href) => router.push(href), isOffline)}
              />
            )) : (
              <SectionEmptyState
                icon="calendar"
                title="Nenhuma novidade"
                text="Confirmações e avisos dos seus eventos aparecem aqui."
              />
            )}
          </View>
        </View>
        {isLoadingMore && <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais notificações" />}
      </ScrollView>
      {unreadCount > 0 && (
        // `box-none`: a faixa que centraliza o botão não intercepta toques na lista.
        <View style={styles.floatingAction} pointerEvents="box-none">
          <View style={[styles.floatingButton, isOffline && styles.floatingButtonDisabled]}>
            <Button
              label="Marcar todas como lidas"
              icon="check"
              size="MD"
              disabled={isOffline}
              onPress={() => void markAllAsRead()}
            />
          </View>
        </View>
      )}
      {isOffline && <OfflineBanner />}
    </View>
  );
}

function NotificationsSkeleton({ offline }: { offline: boolean }) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.skeletonContent, offline && styles.skeletonContentOffline]}
      showsVerticalScrollIndicator={false}
      accessible
      accessibilityLabel="Carregando notificações"
    >
      <View style={styles.section}>
        <View style={[styles.inset, styles.skeletonHeadingRow]}>
          <View style={styles.skeletonHeading} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {[0, 1].map((item) => (
            <View key={item} style={styles.skeletonRequestCard}>
              <View style={styles.skeletonRequestImage} />
              <View style={styles.skeletonRequestBody}>
                <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                <View style={styles.skeletonActionRow}>
                  <View style={[styles.skeletonAction, styles.skeletonActionPrimary]} />
                  <View style={[styles.skeletonAction, styles.skeletonActionSecondary]} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      {(['connections', 'events'] as const).map((section) => (
        <View key={section} style={styles.section}>
          <View style={[styles.inset, styles.skeletonHeadingRow]}>
            <View style={styles.skeletonHeading} />
          </View>
          <View style={[styles.inset, styles.list]}>
            {[0, 1].map((item) => (
              <View key={`${section}-${item}`} style={styles.skeletonNotificationRow}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonTextLines}>
                  <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                </View>
                <View style={styles.skeletonThumbnail} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
    gap: spacing[24],
  },
  contentOffline: {
    paddingTop: spacing[64],
  },
  skeletonContent: {
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
    gap: spacing[24],
  },
  skeletonContentOffline: {
    paddingTop: spacing[64],
  },
  // Reserva o espaço do botão flutuante para o fim da lista não ficar escondido atrás dele.
  contentWithFloatingAction: {
    paddingBottom: FLOATING_ACTION_CLEARANCE,
  },
  floatingAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[16],
    alignItems: 'center',
  },
  // A sombra e o fundo ficam num wrapper: o Button não expõe elevação, e no
  // Android a sombra só aparece sobre uma view com fundo.
  floatingButton: {
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    ...elevation[3],
  },
  floatingButtonDisabled: {
    backgroundColor: palette.neutral[200],
    ...elevation[1],
  },
  section: {
    gap: spacing[12],
  },
  inset: {
    paddingHorizontal: spacing[16],
  },
  list: {
    gap: spacing[12],
  },
  // O carrossel ocupa a largura toda para os cards rolarem até a borda da tela;
  // o padding só afasta o primeiro e o último.
  carousel: {
    gap: spacing[12],
    paddingHorizontal: spacing[16],
  },
  // Mesma altura do SectionHeader (44), para o skeleton não saltar ao carregar.
  skeletonHeadingRow: {
    height: 44,
    justifyContent: 'center',
  },
  skeletonHeading: {
    width: '60%',
    height: typography.overline.lineHeight,
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  skeletonRequestCard: {
    width: layout.eventCard.miniWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface.card,
  },
  skeletonRequestImage: {
    width: '100%',
    height: layout.eventCard.requestImageHeight,
    backgroundColor: colors.surface.sunken,
  },
  skeletonRequestBody: {
    padding: spacing[12],
    gap: spacing[8],
  },
  skeletonLine: {
    height: spacing[8],
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  skeletonLineMedium: {
    width: '80%',
  },
  skeletonLineShort: {
    width: '54%',
  },
  skeletonActionRow: {
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  skeletonAction: {
    height: layout.eventCard.requestActionHeight,
    borderRadius: radius.sm,
  },
  skeletonActionPrimary: {
    flex: 1,
    backgroundColor: colors.surface.sunken,
  },
  skeletonActionSecondary: {
    width: layout.eventCard.requestRejectWidth,
    backgroundColor: colors.surface.sunken,
  },
  skeletonNotificationRow: {
    minHeight: layout.notificationItem.minHeightPlain,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  skeletonAvatar: {
    width: layout.notificationItem.thumbSize,
    height: layout.notificationItem.thumbSize,
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  skeletonTextLines: {
    flex: 1,
    gap: spacing[8],
  },
  skeletonThumbnail: {
    width: layout.notificationItem.trailingThumbSize,
    height: layout.notificationItem.trailingThumbSize,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.sunken,
  },
});
