import { useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { useRegisterDevice } from '@/hooks/useRegisterDevice';
import { usePushPermission } from '@/hooks/usePushPermission';
import { ensureNotificationChannel } from '@/utils/notificationChannel';

/** Token remoto do Expo; null quando o ambiente não consegue gerar um (Expo Go, simulador, sem projectId). */
async function fetchExpoPushToken(): Promise<string | null> {
  // O Expo Go não recebe push remoto: só o development build e o app publicado.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (!Device.isDevice) return null;

  // Preenchido por `eas init` em extra.eas.projectId.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    if (__DEV__) console.warn('[push] sem extra.eas.projectId no app.json: rode `eas init`');
    return null;
  }

  try {
    await ensureNotificationChannel();
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (caught) {
    // Ex.: Android sem google-services.json (FCM) no build.
    if (__DEV__) console.warn('[push] não foi possível obter o token remoto:', caught);
    return null;
  }
}

/**
 * Pede a permissão com o diálogo nativo do sistema e, concedida, registra o
 * aparelho no backend. Roda a cada abertura do app: o POST é um upsert por
 * token, então também reatribui o aparelho se outra conta entrar nele.
 */
export function PushRegistrationBridge() {
  const { status, request } = usePushPermission();
  const { registerDevice } = useRegisterDevice();
  const hasAsked = useRef(false);

  useEffect(() => {
    // Só o estado nunca decidido: negado não pergunta de novo (no iOS o sistema nem deixa).
    if (status !== 'undetermined' || hasAsked.current) return;
    hasAsked.current = true;
    request().catch(() => {});
  }, [status, request]);

  useEffect(() => {
    if (status !== 'granted') return;

    let isCurrent = true;
    void fetchExpoPushToken().then((token) => {
      if (token && isCurrent) void registerDevice(token);
    });

    return () => {
      isCurrent = false;
    };
  }, [status, registerDevice]);

  return null;
}
