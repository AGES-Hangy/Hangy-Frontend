import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import type {
  LocationPermission,
  LocationPermissionStatus,
} from '@/hooks/useLocationPermission.types';

type PermissionState = Pick<LocationPermission, 'status' | 'canAskAgain'>;

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
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(true);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const currentRevision = ++revision.current;
    setIsRefreshing(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (mounted.current && currentRevision === revision.current) {
        setPermission(toPermission(current));
        setError(null);
      }
    } catch {
      if (mounted.current && currentRevision === revision.current) {
        setError('Não foi possível consultar a localização. Tente de novo.');
      }
    } finally {
      if (mounted.current && currentRevision === revision.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      mounted.current = false;
      revision.current += 1;
      subscription.remove();
    };
  }, [refresh]);

  const request = useCallback(async () => {
    // A solicitação invalida qualquer consulta anterior ainda em voo.
    revision.current += 1;
    setIsRefreshing(false);
    const next = toPermission(await Location.requestForegroundPermissionsAsync());
    if (mounted.current) {
      // O retorno do diálogo prevalece sobre consultas disparadas durante ele.
      revision.current += 1;
      setPermission(next);
      setError(null);
      setIsRefreshing(false);
    }
    return next.status;
  }, []);

  return { ...permission, error, isRefreshing, refresh, request };
}
