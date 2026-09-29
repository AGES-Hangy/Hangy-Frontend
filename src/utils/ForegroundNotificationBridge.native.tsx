import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useToast } from '@/components/Toast';
import { notificationRoute } from '@/utils/notificationRoute';

export function ForegroundNotificationBridge() {
  const { addToast } = useToast();

  useEffect(() => {
    Notifications.setNotificationHandler({
      // Com o app aberto o aviso é o toast; o banner do sistema duplicaria. A
      // notificação fica na lista do sistema para o toque abrir depois.
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, data } = notification.request.content;
      addToast({
        type: 'info',
        message: title ?? 'Nova notificação',
        actionLabel: 'Ver',
        onAction: () => router.push(notificationRoute(data)),
      });
    });

    return () => {
      subscription.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [addToast]);

  return null;
}
