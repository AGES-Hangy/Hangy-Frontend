import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { IconButton } from '@/components/IconButton';

describe('IconButton', () => {
  it('executa a ação e renderiza um ícone do Design System', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <IconButton
        icon="share"
        accessibilityLabel="Compartilhar evento"
        variant="Filled"
        size="LG"
        onPress={onPress}
      />,
    );

    await user.press(
      screen.getByRole('button', { name: 'Compartilhar evento' }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('bloqueia a ação quando está desabilitado', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <IconButton
        icon="trash-2"
        accessibilityLabel="Excluir"
        disabled
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button).toBeDisabled();

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('suporta variantes, tamanhos e elemento customizado como ícone', async () => {
    const user = userEvent.setup();

    await render(
      <>
        <IconButton icon="bell" accessibilityLabel="Tonal" variant="Tonal" size="MD" />
        <IconButton icon="settings" accessibilityLabel="Contorno" variant="Outline" size="SM" />
        <IconButton
          icon={<Text>!</Text>}
          accessibilityLabel="Customizado"
          variant="Ghost"
          size="LG"
        />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Tonal' }));
    await user.press(screen.getByRole('button', { name: 'Contorno' }));
    await user.press(screen.getByRole('button', { name: 'Customizado' }));

    expect(screen.getByText('!')).toBeOnTheScreen();
  });
});
