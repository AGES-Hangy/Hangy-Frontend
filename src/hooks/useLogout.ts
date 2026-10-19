import { useCallback, useState } from 'react';
import { router } from 'expo-router';

import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { removeToken } from '@/utils/auth';
import { removePushToken } from '@/utils/pushToken';

export function useLogout() {
  const { unregisterDevice } = useUnregisterDevice();
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    // Antes de removeToken porque o DELETE precisa do Bearer.
    await unregisterDevice({ isLoggingOut: true });
    await removePushToken();
    await removeToken();
    router.replace('/Login');
  }, [isLoading, unregisterDevice]);

  return { logout, isLoading };
}