import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { removeToken } from '@/utils/auth';
import { removePushToken } from '@/utils/pushToken';

export function useLogout() {
  const { unregisterDevice } = useUnregisterDevice();
  const { showErrorToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);

  const logout = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      // Antes de removeToken porque o DELETE precisa do Bearer.
      await unregisterDevice({ isLoggingOut: true });
      await removePushToken();
      await removeToken();
      router.replace('/Login');
    } catch {
      showErrorToast('Não foi possível sair da conta. Tente de novo.');
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [showErrorToast, unregisterDevice]);

  return { logout, isLoading };
}
