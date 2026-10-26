import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'default';

/** No Android 13+ o diálogo de permissão e o token só funcionam depois que existe um canal. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Notificações',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
