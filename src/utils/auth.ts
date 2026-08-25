import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@hangy:token';

export function saveToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function removeToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_KEY);
}
