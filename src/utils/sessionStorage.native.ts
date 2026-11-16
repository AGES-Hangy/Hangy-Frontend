import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Sessão no Keychain (iOS) / Keystore (Android), fora do AsyncStorage, que é
 * texto puro no aparelho. As chaves do SecureStore só aceitam
 * `[A-Za-z0-9._-]`, por isso o `@hangy:` vira `hangy.`.
 *
 * Versões anteriores guardavam o token no AsyncStorage: a primeira leitura
 * move o valor antigo para o SecureStore e apaga a cópia insegura.
 */
function secureKey(key: string) {
  return key.replace(/[^A-Za-z0-9._-]/g, '.');
}

export async function readSecret(key: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(secureKey(key));
  if (stored !== null) return stored;
  const legacy = await AsyncStorage.getItem(key);
  if (legacy === null) return null;
  await SecureStore.setItemAsync(secureKey(key), legacy);
  await AsyncStorage.removeItem(key);
  return legacy;
}

export function writeSecret(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(secureKey(key), value);
}

export async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(secureKey(key));
  await AsyncStorage.removeItem(key);
}
