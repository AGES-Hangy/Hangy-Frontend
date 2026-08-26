import type { icons } from '@/components/Icon/icons';

/**
 * Nome lucide em kebab-case, igual ao nome do símbolo no Figma
 * (`Icon/bell` -> `'bell'`). Fechado pelo contrato do Design System.
 */
export type IconName = keyof typeof icons;

export type IconProps = {
  /** Nome lucide em kebab-case, igual ao Figma. */
  name: IconName;
  /** Lado do frame quadrado, em px. Figma: 24. */
  size?: number;
  /** Cor do traço (outline). Sempre um token de `@/constants/colors`. */
  color?: string;
  /** Cor de preenchimento. `'none'` (padrão) mantém o ícone só de traço. */
  fill?: string;
  /** Espessura do traço. Figma: 2 — não mexer sem alinhar com design. */
  strokeWidth?: number;
  /**
   * Mantém a espessura do traço constante quando `size` muda, em vez de
   * escalar junto. Recomendado pela documentação do Figma ao reduzir o ícone.
   */
  absoluteStrokeWidth?: boolean;
  /**
   * Rótulo para leitor de tela. Sem ele o ícone é tratado como decorativo e
   * removido da árvore de acessibilidade — o certo quando existe um texto ou
   * um `accessibilityLabel` no elemento tocável em volta.
   */
  accessibilityLabel?: string;
};
