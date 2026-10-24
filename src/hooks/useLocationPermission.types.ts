export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unsupported' | null;

export interface LocationPermission {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
  error: string | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  request: () => Promise<Exclude<LocationPermissionStatus, null>>;
}
