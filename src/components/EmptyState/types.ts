import type { IconName } from '@/components/Icon';

export type EmptyStateContext = 'Home' | 'Map' | 'Search' | 'Photos' | 'MyEvents' | 'Notifications';

export interface EmptyStateProps {
  context: EmptyStateContext;
  cta?: boolean;
  ctaLabel?: string;
  onCtaPress?: () => void;
  ctaAtBottom?: boolean;
  ctaDisabled?: boolean;
  /** Ocupa a área disponível para centralizar o estado vazio na tela. */
  fill?: boolean;
  /**
   * Sobrescreve o título do `context`. Existe para os casos em que a mensagem
   * vem do servidor e não de um estado fixo do app — evento cancelado, evento
   * indisponível, falha ao carregar. Sem isto, cada um desses viraria um
   * `context` novo no Design System só para trocar duas frases.
   */
  title?: string;
  /** Sobrescreve o texto do `context`. Ver `title`. */
  text?: string;
  /**
   * Sobrescreve o ícone do `context`. Existe para as telas que não têm um
   * `context` próprio no Design System — como "Usuários bloqueados", que usa
   * `ban` — sem criar um `context` só para trocar o ícone. Ver `title`.
   */
  icon?: IconName;
}
