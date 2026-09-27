import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { NotificationItem } from '@/components/NotificationItem';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { MockNotification } from '@/mocks/notifications';
import { useNotificationMock } from '@/providers/NotificationMockProvider';

type RequestNotification = Extract<MockNotification, { type: 'Request' }>;
type ConnectionNotification = Extract<MockNotification, { type: 'Connection' }>;
type ActivityNotification = Extract<MockNotification, { type: 'Activity' }>;

export default function Notifications() {
  const { notifications, markAsRead, markManyAsRead, dismiss } = useNotificationMock();
  const requests = notifications.filter(
    (notification): notification is RequestNotification => notification.type === 'Request',
  );
  const connections = notifications.filter(
    (notification): notification is ConnectionNotification => notification.type === 'Connection',
  );
  const activities = notifications.filter(
    (notification): notification is ActivityNotification => notification.type === 'Activity',
  );

  if (notifications.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState context="Notifications" fill />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {requests.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Solicitações de participação"
            variant="overline"
            action
            showActionIcon={false}
            onActionPress={() => router.push('/Notifications/ParticipationRequests')}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {requests.map((request, index) => (
              <EventCard
                key={request.id}
                variant="Request"
                event={request.event}
                isNew={index === 0 && !request.read}
                onAcceptRequest={() => dismiss(request.id)}
                onRejectRequest={() => dismiss(request.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {connections.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Solicitações de conexão" variant="overline" />
          <NotificationItem
            type="ConnectionGroup"
            title={`${connections.length} novas solicitações`}
            subtitle={connections[0].timeAgo}
            avatars={connections.map((request) => ({ accessibilityLabel: request.name }))}
            read={connections.every((request) => request.read)}
            onPress={() => {
              markManyAsRead(connections.map((request) => request.id));
              router.push('/Notifications/ConnectionRequests');
            }}
          />
        </View>
      )}

      {activities.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Seus eventos" variant="overline" />
          <View style={styles.activityList}>
            {activities.map((notification) => (
              <NotificationItem
                key={notification.id}
                type="Activity"
                title={notification.title}
                subtitle={notification.subtitle}
                trailingImageUri={notification.eventImageUri}
                read={notification.read}
                onPress={() => markAsRead(notification.id)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingTop: spacing[8],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  section: {
    gap: spacing[8],
    paddingHorizontal: spacing[16],
  },
  carousel: {
    gap: spacing[12],
  },
  activityList: {
    gap: spacing[8],
  },
});
