import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/Icon';

/**
 * Cor do círculo do ícone. `error` é o frame `Erro do servidor`, `warning` o
 * `Sem conexão`, `neutral` o roxo do `EmptyState` (conteúdo indisponível, sem
 * culpa de ninguém).
 */
export type ErrorScreenTone = 'error' | 'warning' | 'neutral';

export type ErrorScreenAction = {
  label: string;
  onPress: () => void;
  /** Padrão: o próprio `label`. */
  accessibilityLabel?: string;
  /** Mostra o `Button` em `State=Loading` enquanto a requisição refeita está em voo. */
  isLoading?: boolean;
  disabled?: boolean;
};

export type ErrorScreenProps = {
  title: string;
  message: string;
  /** Padrão: `circle-alert`. */
  icon?: IconName;
  /** Padrão: `error`. */
  tone?: ErrorScreenTone;
  /**
   * Botão principal, fixo no rodapé. Para o erro do servidor é o "Tentar de
   * novo", que deve refazer a requisição que falhou (o `reload` do hook), não
   * remontar a tela. Sem ação, a tela só informa.
   */
  action?: ErrorScreenAction;
  /** Conteúdo extra abaixo do botão, por exemplo "Sair da conta" no Perfil. */
  footer?: ReactNode;
  /**
   * Troca o respiro do rodapé (32 até a BottomNav, como no frame) por 16 + a
   * safe area inferior. Ligue nas telas sem a barra de abas (`noNavbarScreens`):
   * sem ela, o botão fixo fica sob o indicador de gestos do iOS.
   */
  withBottomInset?: boolean;
  /** Escape hatch de layout (ex.: respiro do `OfflineBanner`). Não use para trocar cor. */
  style?: StyleProp<ViewStyle>;
};
