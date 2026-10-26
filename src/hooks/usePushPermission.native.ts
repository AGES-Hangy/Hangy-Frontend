import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { PushPermission, PushPermissionStatus } from '@/hooks/usePushPermission.types';
import { ensureNotificationChannel } from '@/utils/notificationChannel';

type PermissionState = Omit<PushPermission, 'request'>;

function toPermission(
  permission: Notifications.NotificationPermissionsStatus,
): PermissionState & { status: Exclude<PushPermissionStatus, null> } {
  const status = permission.granted
    ? 'granted'
    : permission.status === Notifications.PermissionStatus.UNDETERMINED
      ? 'undetermined'
      : 'denied';
  return { status, canAskAgain: permission.canAskAgain };
}

export function usePushPermission(): PushPermission {
  const [permission, setPermission] = useState<PermissionState>({ status: null, canAskAgain: false });

  useEffect(() => {
    let isMounted = true;

    function refresh() {
      Notifications.getPermissionsAsync()
        .then((current) => {
          if (isMounted) setPermission(toPermission(current));
        })
        .catch(() => {});
    }

    refresh();
    // A permissão pode ser trocada nos Ajustes do sistema com o app em segundo plano.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const request = useCallback(async () => {
    await ensureNotificationChannel();

    const next = toPermission(await Notifications.requestPermissionsAsync());
    setPermission(next);
    return next.status;
  }, []);

  return { ...permission, request };
}
