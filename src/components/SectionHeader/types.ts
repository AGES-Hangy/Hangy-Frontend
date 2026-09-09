export interface SectionHeaderProps {
  /** Título da seção */
  title: string;
  /** Estilo do título: "title" (H3, color/text/primary) ou "overline" (Overline, color/text/tertiary, CAIXA ALTA). Padrão: "title" */
  variant?: 'title' | 'overline';
  /** Mostra ou esconde o link de ação (padrão: false) */
  action?: boolean;
  /** Texto do link de ação. Padrão: "Ver todos" */
  actionLabel?: string;
  /** Callback do link — a tela decide para onde navegar, o componente não hardcoda rota */
  onActionPress?: () => void;
  /** accessibilityLabel customizado para o link (fallback: actionLabel) */
  actionAccessibilityLabel?: string;
}