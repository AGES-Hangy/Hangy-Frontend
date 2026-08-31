import type { ReactNode } from 'react';

/**
 * Variantes da barra superior. Cada uma é um eixo de variante real na seção
 * TopAppBar da página Components do Figma.
 */
export type TopAppBarVariant = 'Home' | 'Detail' | 'Modal' | 'BrandBack' | 'Profile';

export interface TopAppBarProps {
  /** Define o conteúdo da barra. */
  variant?: TopAppBarVariant;

  /** Título — centralizado em `Detail` e `Profile`, à esquerda em `Modal`. */
  title?: string;

  /** Ação do botão voltar. Sem isto, cai em `router.back()`. */
  onBack?: () => void;

  /**
   * `Home`: número de notificações não lidas. Acima de zero, o sino ganha o
   * ponto vermelho. O valor em si ainda não é exibido — o `Badge/Notification`
   * que mostra a contagem é de outra task.
   */
  unreadCount?: number;

  /** `Home`: toque no sino. Sem isto, navega para `(screens)/Notifications`. */
  onNotificationsPress?: () => void;

  /**
   * `Home`: avatar de 36 à esquerda, que abre o perfil. Entra por slot porque
   * o `Avatar` é componente de outra task; sem ele, o espaço é reservado para
   * o logo continuar centralizado (é o que o frame do Figma faz).
   */
  avatar?: ReactNode;
  /** `Home`: toque no avatar. */
  onAvatarPress?: () => void;

  /** `Detail`: ícone de compartilhar à direita. Sem isto, vira espaçador. */
  onShare?: () => void;

  /** `Profile`: ícone de denunciar à direita. Sem isto, vira espaçador. */
  onReport?: () => void;
}
