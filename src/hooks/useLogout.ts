import { useCallback, useRef, useState } from 'react';
import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { endpoints } from '@/constants/api';
import { getRefreshToken, removeToken } from '@/utils/auth';
import { apiFetch } from '@/utils/http';
import { removePushToken } from '@/utils/pushToken';

/**
 * Avisa o backend para invalidar o refresh token deste aparelho. Falhar aqui
 * (sem rede, por exemplo) não impede sair: o token local é apagado de todo jeito.
 */
async function revokeRefreshToken() {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return;
    await apiFetch(endpoints.logout(), {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, { skipUnauthorizedHandler: true });
  } catch {
    // Melhor esforço.
  }
}

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
      await revokeRefreshToken();
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
