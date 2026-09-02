import type { IconName } from '@/components/Icon';

/**
 * Variantes da barra superior. Cada uma é um eixo de variante real na seção
 * TopAppBar da página Components do Figma.
 */
export type TopAppBarVariant = 'Home' | 'Detail' | 'Modal' | 'BrandBack' | 'Profile';

/** Ação do slot da direita nas variantes claras (compartilhar, denunciar...). */
export interface TopAppBarAction {
  icon: IconName;
  /** Obrigatório: o botão é só ícone, sem label visível. */
  accessibilityLabel: string;
  onPress: () => void;
}

export interface TopAppBarProps {
  /** Define o conteúdo da barra. */
  variant?: TopAppBarVariant;

  /** Título — centralizado na tela em `Detail` e `Profile`, à esquerda em `Modal`. */
  title?: string;

  /** Ação do botão voltar. Sem isto, cai em `router.back()`. */
  onBack?: () => void;

  /**
   * Esconde o botão voltar, mantendo o título centralizado. É o caso do perfil
   * próprio, que é raiz de aba e não veio de lugar nenhum.
   */
  showBack?: boolean;

  /**
   * `Home`: número de notificações não lidas. Acima de zero, o sino ganha o
   * ponto vermelho. O valor em si ainda não é exibido — o `Badge/Notification`
   * que mostra a contagem é de outra task.
   */
  unreadCount?: number;

  /** `Home`: toque no sino. Sem isto, navega para `(screens)/Notifications`. */
  onNotificationsPress?: () => void;

  /**
   * Ação no canto direito das variantes claras. Sem ela o slot vira espaçador,
   * para o título continuar centralizado na tela.
   */
  action?: TopAppBarAction;
}
