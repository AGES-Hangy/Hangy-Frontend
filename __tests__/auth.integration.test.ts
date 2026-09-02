import AsyncStorage from '@react-native-async-storage/async-storage';

import { getToken, removeToken, saveToken } from '@/utils/auth';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('persistência de autenticação', () => {
  it('salva, lê e remove o token', async () => {
    expect(await getToken()).toBeNull();

    await saveToken('token-de-teste');
    expect(await getToken()).toBe('token-de-teste');

    await removeToken();
    expect(await getToken()).toBeNull();
  });
});
