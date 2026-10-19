import type { LocationPermission } from '@/hooks/useLocationPermission.types';

const request = async () => 'unsupported' as const;

export function useLocationPermission(): LocationPermission {
  return { status: 'unsupported', canAskAgain: false, request };
}