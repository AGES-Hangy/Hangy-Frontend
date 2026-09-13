export type EmptyStateContext = 'Home' | 'Map' | 'Search' | 'Photos' | 'MyEvents';

export interface EmptyStateProps {
  context: EmptyStateContext;
  cta?: boolean;
  ctaLabel?: string;
  onCtaPress?: () => void;
  /**
   * Sobrescreve o título do `context`. Existe para os casos em que a mensagem
   * vem do servidor e não de um estado fixo do app — evento cancelado, evento
   * indisponível, falha ao carregar. Sem isto, cada um desses viraria um
   * `context` novo no Design System só para trocar duas frases.
   */
  title?: string;
  /** Sobrescreve o texto do `context`. Ver `title`. */
  text?: string;
}
