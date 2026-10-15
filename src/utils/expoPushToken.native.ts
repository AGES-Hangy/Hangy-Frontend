import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { ensureNotificationChannel } from '@/utils/notificationChannel';

/** Token remoto do Expo; null quando o ambiente não consegue gerar um (Expo Go, simulador, sem projectId). */
export async function fetchExpoPushToken(): Promise<string | null> {
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
