import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { Header } from '@/components/Header';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    push: jest.fn(),
  },
}));

const backMock = router.back as jest.MockedFunction<typeof router.back>;
const canGoBackMock = router.canGoBack as jest.MockedFunction<typeof router.canGoBack>;
const pushMock = router.push as jest.MockedFunction<typeof router.push>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Header', () => {
  it('mantém o botão de voltar bloqueado quando não existe histórico', async () => {
    canGoBackMock.mockReturnValue(false);

    await render(<Header />);

    const backButton = screen.getByRole('button', { name: 'Voltar' });
    const notificationsButton = screen.getByRole('button', {
      name: 'Abrir notificações',
    });

    expect(backButton).toBeDisabled();

    await fireEvent.press(backButton);
    await fireEvent.press(notificationsButton);

    expect(backMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/Notifications');
  });

  it('volta quando existe histórico de navegação', async () => {
    canGoBackMock.mockReturnValue(true);

    await render(<Header />);

    const backButton = screen.getByRole('button', { name: 'Voltar' });
    expect(backButton).toBeEnabled();
    await fireEvent.press(backButton);

    expect(backMock).toHaveBeenCalledTimes(1);
  });
});
