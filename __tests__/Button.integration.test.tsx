import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Button } from '@/components/Button';

describe('Button', () => {
  it('executa a ação pelo nome acessível e aceita ícone do Design System', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(<Button label="Criar evento" icon="plus" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Criar evento' });
    expect(button).toBeEnabled();

    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('bloqueia a ação nos estados disabled e loading', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <>
        <Button label="Desabilitado" disabled onPress={onPress} />
        <Button label="Carregando" isLoading onPress={onPress} />
      </>,
    );

    const disabledButton = screen.getByRole('button', { name: 'Desabilitado' });
    const loadingButton = screen.getByRole('button', { name: 'Carregando' });

    expect(disabledButton).toBeDisabled();
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toBeBusy();

    await user.press(disabledButton);
    await user.press(loadingButton);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('suporta variantes, tamanhos, label customizada e elemento como ícone', async () => {
    const user = userEvent.setup();

    await render(
      <>
        <Button label="Secundário" variant="Secondary" size="MD" />
        <Button label="Destaque" variant="Accent" size="SM" />
        <Button
          label="Texto"
          variant="Tertiary"
          accessibilityLabel="Ação terciária"
          icon={<Text>★</Text>}
        />
        <Button label="Excluir" variant="Danger" disabled />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Secundário' }));
    await user.press(screen.getByRole('button', { name: 'Destaque' }));
    await user.press(screen.getByRole('button', { name: 'Ação terciária' }));

    expect(screen.getByText('★')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
  });
});
