import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NotificationItem } from '@/components/NotificationItem';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { MockNotification } from '@/mocks/notifications';
import { useNotificationMock } from '@/providers/NotificationMockProvider';

export default function ConnectionRequests() {
  useTopAppBar({ variant: 'BrandBack' });
  const { notifications, markAsRead, markManyAsRead, dismiss } = useNotificationMock();
  const requests = notifications.filter(
    (notification): notification is Extract<MockNotification, { type: 'Connection' }> =>
      notification.type === 'Connection',
  );
  const unreadIds = requests.filter((request) => !request.read).map((request) => request.id);
  const unreadIdsKey = unreadIds.join(',');

  useEffect(() => {
    if (unreadIdsKey) markManyAsRead(unreadIdsKey.split(','));
  }, [unreadIdsKey, markManyAsRead]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Solicitações de conexão" variant="overline" />
      <View style={styles.list}>
        {requests.map((request) => (
          <NotificationItem
            key={request.id}
            type="Connection"
            title={`${request.name} quer se conectar com você`}
            subtitle={request.timeAgo}
            read={request.read}
            onMarkRead={!request.read ? () => markAsRead(request.id) : undefined}
            onAccept={() => dismiss(request.id)}
            onReject={() => dismiss(request.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[12],
  },
  list: {
    gap: spacing[12],
  },
});
