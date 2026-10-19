import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import type {
  LocationPermission,
  LocationPermissionStatus,
} from '@/hooks/useLocationPermission.types';

type PermissionState = Omit<LocationPermission, 'request'>;

function toPermission(
  permission: Location.LocationPermissionResponse,
): PermissionState & { status: Exclude<LocationPermissionStatus, null> } {
  const status = permission.granted
    ? 'granted'
    : permission.status === Location.PermissionStatus.UNDETERMINED
      ? 'undetermined'
      : 'denied';
  return { status, canAskAgain: permission.canAskAgain };
}

export function useLocationPermission(): LocationPermission {
  const [permission, setPermission] = useState<PermissionState>({
    status: null,
    canAskAgain: false,
  });

  useEffect(() => {
    let isMounted = true;

    function refresh() {
      Location.getForegroundPermissionsAsync()
        .then((current) => {
          if (isMounted) setPermission(toPermission(current));
        })
        .catch(() => {});
    }

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const request = useCallback(async () => {
    const next = toPermission(await Location.requestForegroundPermissionsAsync());
    setPermission(next);
    return next.status;
  }, []);

  return { ...permission, request };
}