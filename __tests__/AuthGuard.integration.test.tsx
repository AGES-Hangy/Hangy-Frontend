import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { AuthGuard } from '@/utils/AuthGuard';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

const replaceMock = router.replace as jest.MockedFunction<typeof router.replace>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('AuthGuard', () => {
  it('renderiza o conteúdo protegido quando existe um token', async () => {
    await AsyncStorage.setItem('@hangy:token', 'token-de-teste');

    await render(
      <AuthGuard>
        <Text>Conteúdo protegido</Text>
      </AuthGuard>,
    );

    expect(await screen.findByText('Conteúdo protegido')).toBeOnTheScreen();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redireciona para o Login quando não existe um token', async () => {
    await render(
      <AuthGuard>
        <Text>Conteúdo protegido</Text>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/Login');
    });
    expect(screen.queryByText('Conteúdo protegido')).not.toBeOnTheScreen();
  });

  it('ignora o resultado da leitura quando desmonta antes da resposta', async () => {
    let resolveToken: ((token: string | null) => void) | undefined;
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(
      new Promise((resolve) => {
        resolveToken = resolve;
      }),
    );

    const { unmount } = await render(
      <AuthGuard>
        <Text>Conteúdo protegido</Text>
      </AuthGuard>,
    );

    await unmount();
    await act(async () => resolveToken?.('token-de-teste'));

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
