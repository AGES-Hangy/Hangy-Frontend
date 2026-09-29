import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { notificationRoute } from '@/utils/notificationRoute';

// O getLast e o listener podem entregar a mesma resposta no toque com o app fechado.
let lastHandledId: string | null = null;

function openNotification(response: Notifications.NotificationResponse) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

  const { identifier, content } = response.notification.request;
  if (identifier === lastHandledId) return;
  lastHandledId = identifier;

  // Sem isto, um novo login no mesmo processo leria de novo a última resposta.
  Notifications.clearLastNotificationResponse();
  router.push(notificationRoute(content.data));
}

export function NotificationResponseBridge() {
  useEffect(() => {
    const initial = Notifications.getLastNotificationResponse();
    if (initial) openNotification(initial);

    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, []);

  return null;
}
