import { useCallback } from 'react';

import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import { getPushToken, removePushToken } from '@/utils/pushToken';

/**
 * Nunca lança: 404 conta como sucesso e qualquer outra falha é silenciosa,
 * para não travar o logout. Devolve `false` só quando o token continua no
 * backend — o logout ignora, o toggle de notificações usa para reverter.
 */
export function useUnregisterDevice() {
  const unregisterDevice = useCallback(
    async ({ isLoggingOut = false }: { isLoggingOut?: boolean } = {}): Promise<boolean> => {
      try {
        const pushToken = await getPushToken();
        if (!pushToken) return true;

        await apiFetch(endpoints.device(pushToken), { method: 'DELETE' }, {
          skipUnauthorizedHandler: isLoggingOut,
        });
        await removePushToken();
        return true;
      } catch (caught) {
        if (isApiErrorLike(caught) && caught.status === 404) {
          await removePushToken();
          return true;
        }
        return false;
      }
    },
    [],
  );

  return { unregisterDevice };
}
