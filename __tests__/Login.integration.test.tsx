import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import Login from '@/app/Login';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
const replaceMock = router.replace as jest.MockedFunction<typeof router.replace>;
const originalFetch = global.fetch;

async function fillAndSubmitLogin() {
  await fireEvent.changeText(
    screen.getByPlaceholderText('E-mail'),
    'joao@hangy.com',
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText('Senha'),
    'senha-segura',
  );
  await fireEvent.press(screen.getByText('Entrar'));
}

beforeAll(() => {
  global.fetch = fetchMock;
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('Login', () => {
  it('envia as credenciais, salva o token e navega para a Home', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'token-de-teste',
        token_type: 'bearer',
      }),
    } as Response);

    await render(<Login />);
    await fillAndSubmitLogin();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=joao%40hangy.com&password=senha-segura',
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@hangy:token',
        'token-de-teste',
      );
      expect(replaceMock).toHaveBeenCalledWith('/Home');
    });
  });

  it('mostra erro e permanece na tela quando as credenciais são inválidas', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    await render(<Login />);
    await fillAndSubmitLogin();

    expect(
      await screen.findByText('E-mail ou senha inválidos'),
    ).toBeOnTheScreen();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('mostra erro de conexão quando o backend não responde', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Falha de rede'));

    await render(<Login />);
    await fillAndSubmitLogin();

    expect(
      await screen.findByText('Não foi possível conectar ao servidor'),
    ).toBeOnTheScreen();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
