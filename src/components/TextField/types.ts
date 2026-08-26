import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** Eixo `Type` do Figma — muda comportamento e affordance do campo. */
export type TextFieldType =
  | 'Text'
  | 'Search'
  | 'Password'
  | 'Date'
  | 'Tags'
  | 'Location'
  | 'TextArea'
  | 'Select';

/**
 * Eixo `State` do Figma. Não é uma prop: sai de `disabled`, `error`,
 * `success`, do foco e de o campo ter ou não valor.
 */
export type TextFieldState =
  | 'Default'
  | 'Filled'
  | 'Focused'
  | 'Error'
  | 'Success'
  | 'Disabled';

/** Item das listas de `Select` e do autocomplete de `Location`. */
export type TextFieldOption = {
  value: string;
  label: string;
};

export type TextFieldProps = {
  type?: TextFieldType;
  /** Label Label M acima do campo. */
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  /** Texto de apoio abaixo do campo (Body S). */
  helper?: string;
  /** Mensagem de erro — força o estado `Error`. */
  error?: string;
  /** Mensagem de sucesso — força o estado `Success`. */
  success?: string;
  disabled?: boolean;
  /**
   * Reserva a linha da mensagem mesmo sem `helper`/`error`/`success` visível,
   * para o formulário não pular quando a primeira validação aparecer. Já é
   * ligado automaticamente quando existe uma mensagem para mostrar.
   */
  reserveMessageSpace?: boolean;

  /**
   * Opções de `Select` e do autocomplete de `Location`. A lista abre ao focar
   * e fecha ao perder o foco.
   */
  options?: TextFieldOption[];
  onSelectOption?: (option: TextFieldOption) => void;

  /**
   * Chips já selecionados de `Type=Tags`, renderizados dentro do campo. Passe
   * instâncias do componente `Chip` do Design System — o TextField só dá o
   * espaço, não desenha o chip.
   */
  tags?: ReactNode;

  /**
   * Toque no campo dos tipos que não aceitam digitação (`Date`, `Select` e
   * `Tags`). É onde a tela abre o date picker nativo, por exemplo.
   */
  onPress?: () => void;

  /** Limite de caracteres. Em `TextArea` também liga o contador do Figma. */
  maxLength?: number;

  /** Padrão: o próprio `label`. */
  accessibilityLabel?: string;
  /** Escape hatch de layout. Não use para sobrescrever cor, raio ou fonte. */
  style?: StyleProp<ViewStyle>;
};
