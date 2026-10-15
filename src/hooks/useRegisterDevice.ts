import { useCallback } from 'react';
import { Platform } from 'react-native';

import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import { savePushToken } from '@/utils/pushToken';

// No módulo, e não em estado, para a desistência valer até o app reiniciar,
// mesmo que a tela que chamou desmonte.
let hasGivenUp = false;

function devicePlatform(): 'ANDROID' | 'IOS' | null {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return null;
}

/**
 * Nunca lança: falhas são silenciosas; formato recusado pelo backend desiste
 * até o app reiniciar. Devolve `true` só quando o backend confirmou o
 * registro — quem não liga para o resultado (abertura do app) ignora.
 */
export function useRegisterDevice() {
  const registerDevice = useCallback(async (pushToken: string): Promise<boolean> => {
    const platform = devicePlatform();
    if (!platform || hasGivenUp) return false;

    try {
      // Salvo antes do POST: se o backend gravar e a resposta se perder, o
      // logout ainda tenta o DELETE, e um 404 lá é inofensivo.
      await savePushToken(pushToken);
      await apiFetch(endpoints.devices(), {
        method: 'POST',
        body: JSON.stringify({ device_token: pushToken, platform }),
      });
      return true;
    } catch (caught) {
      if (isApiErrorLike(caught) && caught.status === 400 && caught.detail === 'Invalid device token format') {
        hasGivenUp = true;
        if (__DEV__) console.warn('[push] backend recusou o formato do token de push');
      }
      return false;
    }
  }, []);

  return { registerDevice };
}
