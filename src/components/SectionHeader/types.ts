export interface SectionHeaderProps {
  /** Título da seção, renderizado como H3 */
  title: string;
  /** Mostra ou esconde o link de ação (padrão: false) */
  action?: boolean;
  /** Texto do link de ação. Padrão: "Ver todos" */
  actionLabel?: string;
  /** Callback do link — a tela decide para onde navegar, o componente não hardcoda rota */
  onActionPress?: () => void;
  /** accessibilityLabel customizado para o link (fallback: actionLabel) */
  actionAccessibilityLabel?: string;
}