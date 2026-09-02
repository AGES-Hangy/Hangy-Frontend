import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { Text } from 'react-native';

import { TextField } from '@/components/TextField';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text: NativeText } = require('react-native');

  const MockDateTimePicker = ({ onChange }: { onChange: (event: unknown, date?: Date) => void }) =>
    React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: 'Selecionar data mock',
        onPress: () => onChange({ type: 'set' }, new Date(2026, 8, 12, 14, 30)),
      },
      React.createElement(NativeText, null, 'Picker mock'),
    );

  return {
    __esModule: true,
    default: MockDateTimePicker,
    DateTimePickerAndroid: {
      dismiss: jest.fn(),
      open: jest.fn(),
    },
  };
});

describe('TextField', () => {
  it('edita texto e apresenta os estados de foco, preenchido e helper', async () => {
    const onChangeText = jest.fn();

    const { rerender } = await render(
      <TextField
        label="Nome"
        placeholder="Digite seu nome"
        helper="Como aparece no perfil"
        onChangeText={onChangeText}
      />,
    );

    const input = screen.getByLabelText('Nome');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'João');
    await fireEvent(input, 'blur');

    expect(onChangeText).toHaveBeenCalledWith('João');
    expect(screen.getByText('Como aparece no perfil')).toBeOnTheScreen();

    await rerender(<TextField label="Nome" value="João" />);
    expect(screen.getByDisplayValue('João')).toBeOnTheScreen();
  });

  it('alterna a visibilidade de uma senha', async () => {
    const user = userEvent.setup();

    await render(
      <TextField type="Password" label="Senha" value="segredo" />,
    );

    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveProp('secureTextEntry', true);

    await user.press(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(passwordInput).toHaveProp('secureTextEntry', false);
    expect(
      screen.getByRole('button', { name: 'Ocultar senha' }),
    ).toBeOnTheScreen();
  });

  it('abre uma lista, seleciona uma opção e fecha o dropdown', async () => {
    const onPress = jest.fn();
    const onSelectOption = jest.fn();
    const user = userEvent.setup();
    const options = [
      { value: 'porto-alegre', label: 'Porto Alegre' },
      { value: 'canoas', label: 'Canoas' },
    ];

    await render(
      <TextField
        type="Select"
        label="Cidade"
        options={options}
        onPress={onPress}
        onSelectOption={onSelectOption}
      />,
    );

    const select = screen.getByRole('button', { name: 'Cidade' });
    expect(select).toBeCollapsed();

    await user.press(select);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(select).toBeExpanded();

    await user.press(screen.getByRole('button', { name: 'Porto Alegre' }));

    expect(onSelectOption).toHaveBeenCalledWith(options[0]);
    expect(screen.queryByText('Canoas')).not.toBeOnTheScreen();
  });

  it('abre opções de localização pelo foco e respeita o estado desabilitado', async () => {
    const options = [{ value: 'pucrs', label: 'PUCRS' }];

    await render(
      <>
        <TextField type="Location" label="Local" options={options} />
        <TextField type="Select" label="Bloqueado" options={options} disabled />
      </>,
    );

    await fireEvent(screen.getByLabelText('Local'), 'focus');

    expect(screen.getByRole('button', { name: 'PUCRS' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bloqueado' })).toBeDisabled();
  });

  it('mostra mensagens de erro, sucesso e espaço reservado', async () => {
    await render(
      <>
        <TextField label="E-mail" error="E-mail inválido" />
        <TextField label="Usuário" success="Disponível" />
        <TextField label="Opcional" reserveMessageSpace />
      </>,
    );

    expect(screen.getByText('E-mail inválido')).toBeOnTheScreen();
    expect(screen.getByText('Disponível')).toBeOnTheScreen();
  });

  it('mostra contador, tags e aceita os tipos de texto auxiliares', async () => {
    await render(
      <>
        <TextField type="TextArea" label="Descrição" value="Hangy" maxLength={100} />
        <TextField type="Tags" label="Tags" tags={<Text>Esporte</Text>} />
        <TextField type="Search" label="Buscar" />
      </>,
    );

    expect(screen.getByText('5/100')).toBeOnTheScreen();
    expect(screen.getByText('Esporte')).toBeOnTheScreen();
    expect(screen.getByLabelText('Buscar')).toBeOnTheScreen();
  });

  it('formata e altera uma data usando o seletor da plataforma', async () => {
    const onChangeDate = jest.fn();
    const onPress = jest.fn();
    const user = userEvent.setup();
    const selectedDate = new Date(2026, 0, 2, 9, 5);

    const { rerender } = await render(
      <TextField
        type="Date"
        label="Data"
        dateValue={selectedDate}
        onChangeDate={onChangeDate}
        onPress={onPress}
      />,
    );

    expect(screen.getByDisplayValue('02/01/2026')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Data' }));
    await user.press(
      screen.getByRole('button', { name: 'Selecionar data mock' }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onChangeDate).toHaveBeenCalledWith(new Date(2026, 8, 12, 14, 30));

    await user.press(screen.getByRole('button', { name: 'Concluir' }));
    expect(
      screen.queryByRole('button', { name: 'Selecionar data mock' }),
    ).not.toBeOnTheScreen();

    await rerender(
      <TextField
        type="Date"
        dateMode="time"
        label="Horário"
        dateValue={selectedDate}
      />,
    );
    expect(screen.getByDisplayValue('09:05')).toBeOnTheScreen();
  });
});
