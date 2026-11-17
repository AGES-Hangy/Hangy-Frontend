import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Onde a sessão fica guardada. Na web não há Keychain/Keystore, então é o
 * AsyncStorage (localStorage); no celular é o `sessionStorage.native.ts`, que
 * usa o armazenamento seguro do sistema.
 */
export function readSecret(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export function writeSecret(key: string, value: string): Promise<void> {
  return AsyncStorage.setItem(key, value);
}

export function deleteSecret(key: string): Promise<void> {
  return AsyncStorage.removeItem(key);
}
