export interface StepperProps {
  /**
   * Total de passos do fluxo.
   * 5 no cadastro pessoa física, 4 no cadastro pessoa jurídica.
   */
  totalSteps: number;
  /**
   * Passo atual, 1-indexed.
   * Passos <= currentStep usam primary/500 (concluído/atual usam a mesma cor).
   * Passos > currentStep usam neutral/200 (futuro).
   */
  currentStep: number;
  /**
   * Exibe o texto "Passo X de Y" abaixo da barra. Default: true.
   * O texto também compõe o accessibilityLabel quando ativo.
   */
  showLabel?: boolean;
  /**
   * Sobrescreve o accessibilityLabel padrão ("Passo X de Y"), caso a tela
   * precise de uma descrição diferente para o leitor de tela.
   */
  accessibilityLabel?: string;
}