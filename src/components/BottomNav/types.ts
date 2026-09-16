/** As 4 abas da barra inferior, nos nomes que o Figma usa no eixo Active. */
export type BottomNavTab = 'Home' | 'AoVivo' | 'Buscar' | 'Perfil';

/**
 * `Limpo` é a variante sem nenhuma aba destacada — usada quando a tela
 * atual está sob `(screens)`, que não pertence a nenhuma aba.
 */
export type BottomNavActive = BottomNavTab | 'Limpo';

export interface BottomNavProps {
  /** Aba destacada. */
  active?: BottomNavActive;
  /** Toque numa aba. */
  onTabPress?: (tab: BottomNavTab) => void;
  /** Ação do botão central de criar evento. Ele não é uma aba. */
  onCreatePress?: () => void;
}
