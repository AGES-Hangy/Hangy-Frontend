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
