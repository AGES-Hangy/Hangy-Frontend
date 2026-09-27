import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NotificationItem } from '@/components/NotificationItem';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { MockNotification } from '@/mocks/notifications';
import { useNotificationMock } from '@/providers/NotificationMockProvider';

function formatEventDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${formattedDate} · ${formattedTime}`;
}

export default function ParticipationRequests() {
  useTopAppBar({ variant: 'BrandBack' });
  const { notifications, markAsRead, markManyAsRead, dismiss } = useNotificationMock();
  const requests = notifications.filter(
    (notification): notification is Extract<MockNotification, { type: 'Request' }> => notification.type === 'Request',
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
      <SectionHeader title="Solicitações de participação" variant="overline" />
      <View style={styles.list}>
        {requests.map((request) => (
          <NotificationItem
            key={request.id}
            type="Request"
            title={`${request.event.requesterName ?? 'Alguém'} quer participar do seu evento`}
            subtitle={[request.event.title, formatEventDate(request.event.date)].filter(Boolean).join(' · ')}
            imageUri={request.event.imageUrl}
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
