import { useCallback } from 'react';

import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import { getPushToken, removePushToken } from '@/utils/pushToken';

/** Nunca lança: 404 conta como sucesso e qualquer outra falha é silenciosa, para não travar o logout. */
export function useUnregisterDevice() {
  const unregisterDevice = useCallback(
    async ({ isLoggingOut = false }: { isLoggingOut?: boolean } = {}): Promise<void> => {
      try {
        const pushToken = await getPushToken();
        if (!pushToken) return;

        await apiFetch(endpoints.device(pushToken), { method: 'DELETE' }, {
          skipUnauthorizedHandler: isLoggingOut,
        });
        await removePushToken();
      } catch (caught) {
        if (isApiErrorLike(caught) && caught.status === 404) await removePushToken();
      }
    },
    [],
  );

  return { unregisterDevice };
}
