export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unsupported' | null;

export interface LocationPermission {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
  request: () => Promise<Exclude<LocationPermissionStatus, null>>;
}