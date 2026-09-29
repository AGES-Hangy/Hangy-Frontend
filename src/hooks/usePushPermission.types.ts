/** `null` enquanto o status ainda está sendo lido do sistema. */
export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unsupported' | null;

export interface PushPermission {
  status: PushPermissionStatus;
  canAskAgain: boolean;
  request: () => Promise<Exclude<PushPermissionStatus, null>>;
}
