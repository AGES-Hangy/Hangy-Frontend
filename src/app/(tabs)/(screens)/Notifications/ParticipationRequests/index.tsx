import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { NotificationCard } from '@/components/NotificationCard';
import { EmptyState } from '@/components/EmptyState';
import { NotificationLoadError } from '@/components/NotificationLoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { openNotification } from '@/constants/notificationRoutes';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNotificationLoadFeedback } from '@/hooks/useNotificationLoadFeedback';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useNotifications } from '@/hooks/useNotifications';

export default function ParticipationRequests() {
  useTopAppBar({ variant: 'BrandBack' });
  const {
    notifications,
    loadNotifications,
    loadMore,
    markAsRead,
    respondToParticipationRequest,
    processingIds,
    error,
    errorKind,
    errorScope,
    canRetryError,
    isLoading,
  } = useNotifications();
  const { isOffline: networkOffline } = useNetworkStatus();
  const isOffline = networkOffline || errorKind === 'offline';
  const retryError = errorScope === 'pagination' ? loadMore : loadNotifications;
  const previousNetworkOffline = useRef(networkOffline);
  const requests = notifications.filter((notification) => notification.type === 'EVENT_PARTICIPATION_REQUEST');

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="SOLICITAÇÕES DE PARTICIPAÇÃO" variant="overline" />
        {error && requests.length > 0 && (
          <NotificationLoadError
            compact
            message={error}
            onRetry={canRetryError && !isOffline ? () => void retryError() : undefined}
          />
        )}
        <View style={styles.list}>
          {requests.map((request) => (
            <NotificationCard
              key={request.notification_id}
              notification={request}
              presentation="list"
              actionsDisabled={isOffline}
              onAccept={() => void respondToParticipationRequest(request.notification_id, 'CONFIRMED')}
              onReject={() => void respondToParticipationRequest(request.notification_id, 'REJECTED')}
              isProcessing={processingIds.has(request.notification_id)}
              onPress={() => openNotification(request, markAsRead, (href) => router.push(href), isOffline)}
            />
          ))}
        </View>
        {!isLoading && requests.length === 0 && error && (
          <NotificationLoadError
            message={error}
            onRetry={canRetryError && !isOffline ? () => void retryError() : undefined}
          />
        )}
        {!isLoading && requests.length === 0 && !error && <EmptyState context="Notifications" />}
      </ScrollView>
      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  content: { flexGrow: 1, paddingHorizontal: spacing[16], paddingTop: spacing[16], paddingBottom: spacing[24], gap: spacing[12] },
  contentOffline: { paddingTop: spacing[64] },
  list: { gap: spacing[12] },
});
