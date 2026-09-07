import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Tamanho e tratamento do tile — eixo `State` do Figma.
 *
 * - `Default`: tile 120×120 da grade de 3 colunas (mosaico, sem raio).
 * - `Expanded`: 244×244 com overlay escuro e botão de câmera ao centro.
 * - `Cover`: capa da tela de detalhe do evento — largura fluida × 237.
 */
export type PhotoTileState = 'Default' | 'Expanded' | 'Cover';

export type PhotoTileProps = {
  state?: PhotoTileState;
  /**
   * Foto exibida no tile. Sem ela o componente cai no placeholder do Figma
   * (fundo primary/200 com o ícone `image` ao centro), que é como as três
   * variantes aparecem no frame de referência.
   */
  uri?: string;
  /** Abre a foto em tela cheia. Sem ele o tile não reage ao toque. */
  onPress?: () => void;
  /**
   * Remove a foto — só passe para o autor dela. Quando presente, um
   * `IconButton` de lixeira aparece no canto superior direito do tile.
   */
  onRemove?: () => void;
  /** Rótulo do leitor de tela. Padrão: 'Foto do evento'. */
  accessibilityLabel?: string;
  /** Rótulo do botão de remover. Padrão: 'Remover foto'. */
  removeAccessibilityLabel?: string;
  /**
   * Escape hatch de layout (ex.: `{ alignSelf: 'stretch' }`). Não use para
   * sobrescrever cor, raio ou tamanho da variante.
   */
  style?: StyleProp<ViewStyle>;
};
