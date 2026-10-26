import type { LocationPermission } from '@/hooks/useLocationPermission.types';

const request = async () => 'unsupported' as const;
const refresh = async () => {};

export function useLocationPermission(): LocationPermission {
  return { status: 'unsupported', canAskAgain: false, error: null, isRefreshing: false, refresh, request };
}
