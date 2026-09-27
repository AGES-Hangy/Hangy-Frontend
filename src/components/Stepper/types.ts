export interface StepperProps {
  /**
   * Passo atual, 1-indexed.
   * Passos <= step usam primary/500 (concluído/atual usam a mesma cor).
   * Passos > step usam neutral/200 (futuro).
   */
  step: number;
  /**
   * Total de passos do fluxo.
   * 5 no cadastro pessoa física (default), 4 no cadastro pessoa jurídica.
   */
  total?: 4 | 5;
}
