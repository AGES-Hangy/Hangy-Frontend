import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useNotifications } from '@/hooks/useNotifications';
import { notificationRoute } from '@/utils/notificationRoute';

// O getLast e o listener podem entregar a mesma resposta no toque com o app fechado.
let lastHandledId: string | null = null;

function openNotification(response: Notifications.NotificationResponse, onOpened: () => void) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const { identifier, content } = response.notification.request;
  if (identifier === lastHandledId) return;
  lastHandledId = identifier;

  // Sem isto, um novo login no mesmo processo leria de novo a última resposta.
  Notifications.clearLastNotificationResponse();
  onOpened();
  router.push(notificationRoute(content.data));
}

export function NotificationResponseBridge() {
  const { loadNotifications } = useNotifications();

  useEffect(() => {
    // A push chegou com o app fechado ou em segundo plano: a central e o ponto do sino estão velhos.
    const onOpened = () => void loadNotifications();

    const initial = Notifications.getLastNotificationResponse();
    if (initial) openNotification(initial, onOpened);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      openNotification(response, onOpened),
    );
    return () => subscription.remove();
  }, [loadNotifications]);

  return null;
}
