import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = '@hangy:pushToken';

export function savePushToken(token: string): Promise<void> {
  return AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export function removePushToken(): Promise<void> {
  return AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

const PUSH_OPT_OUT_KEY = '@hangy:pushOptOut';

/**
 * Preferência do aparelho: o usuário desligou as notificações em Editar
 * perfil. Sem isto, o `PushRegistrationBridge` registraria o aparelho de novo
 * na próxima abertura do app, desfazendo o toggle.
 */
export function setPushOptOut(optedOut: boolean): Promise<void> {
  return optedOut
    ? AsyncStorage.setItem(PUSH_OPT_OUT_KEY, 'true')
    : AsyncStorage.removeItem(PUSH_OPT_OUT_KEY);
}

export async function isPushOptedOut(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_OPT_OUT_KEY)) === 'true';
}
