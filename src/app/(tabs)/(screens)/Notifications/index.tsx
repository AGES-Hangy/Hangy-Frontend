import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { NotificationCard, groupConnectionRequestsByPeriod } from '@/components/NotificationCard';
import { NotificationLoadError } from '@/components/NotificationLoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { openNotification } from '@/constants/notificationRoutes';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNotificationLoadFeedback } from '@/hooks/useNotificationLoadFeedback';
import { useNotifications } from '@/hooks/useNotifications';

export default function Notifications() {
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
        contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}
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
        {unreadCount > 0 && (
          <Pressable
            onPress={() => void markAllAsRead()}
            disabled={isOffline}
            accessibilityRole="button"
            accessibilityLabel="Marcar todas as notificações como lidas"
            accessibilityState={{ disabled: isOffline }}
            style={({ pressed }) => [styles.markAllButton, isOffline && styles.markAllDisabled, pressed && !isOffline && styles.markAllPressed]}
          >
            <Text style={[styles.markAllLabel, isOffline && styles.markAllLabelDisabled]}>Marcar todas como lidas</Text>
          </Pressable>
        )}

        {requests.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="SOLICITAÇÕES DE PARTICIPAÇÃO"
              variant="overline"
              action
              onActionPress={() => router.push('/Notifications/ParticipationRequests')}
            />
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
          </View>
        )}

        {connectionGroups.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="SOLICITAÇÕES DE CONEXÃO" variant="overline" />
            <View style={styles.connectionGroups}>
              {connectionGroups.map((group) => (
                <NotificationCard
                  key={group.period}
                  notifications={group.notifications}
                  onPress={() => router.push({
                    pathname: '/Notifications/ConnectionRequests',
                    params: { period: group.period },
                  })}
                />
              ))}
            </View>
          </View>
        )}

        {activities.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="SEUS EVENTOS" variant="overline" />
            <View style={styles.activityList}>
              {activities.map((notification) => (
                <NotificationCard
                  key={notification.notification_id}
                  notification={notification}
                  onPress={() => openNotification(notification, markAsRead, (href) => router.push(href), isOffline)}
                />
              ))}
            </View>
          </View>
        )}
        {isLoadingMore && <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais notificações" />}
      </ScrollView>
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
        <View style={styles.skeletonHeading} />
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
          <View style={styles.skeletonHeading} />
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
    paddingTop: spacing[8],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  contentOffline: {
    paddingTop: spacing[64],
  },
  skeletonContent: {
    paddingTop: spacing[8],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  skeletonContentOffline: {
    paddingTop: spacing[64],
  },
  markAllButton: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[16],
  },
  markAllPressed: {
    opacity: pressedOpacity,
  },
  markAllLabel: {
    ...typography.labelM,
    color: colors.text.brand,
  },
  markAllDisabled: {
    opacity: pressedOpacity,
  },
  markAllLabelDisabled: {
    color: colors.text.disabled,
  },
  section: {
    gap: spacing[8],
    paddingHorizontal: spacing[16],
  },
  carousel: {
    gap: spacing[12],
  },
  connectionGroups: {
    gap: spacing[8],
  },
  activityList: {
    gap: spacing[8],
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
