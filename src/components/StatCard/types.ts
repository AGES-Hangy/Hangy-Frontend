import type { StyleProp, ViewStyle } from 'react-native';

export type StatCardTone = 'Neutral' | 'Alert' | 'Success';

export interface StatCardProps {
  /** Nome da métrica, ex.: "Denúncias pendentes" */
  label: string;
  /** Valor já formatado por quem chama; o componente não formata números */
  value: string | number;
  /** Texto de apoio abaixo do valor. Vazio ou só espaços conta como ausente e não ocupa espaço. */
  support?: string;
  /** Cor do fundo, da borda e do valor. Padrão: "Neutral" */
  tone?: StatCardTone;
  /**
   * Só para layout do pai. O cartão não tem largura nem altura fixas: a tela define a largura
   * (ex.: `flex: 1` numa linha) e o alinhamento das alturas vem do `alignItems: 'stretch'` do pai.
   */
  style?: StyleProp<ViewStyle>;
}
