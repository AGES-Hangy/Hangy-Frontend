import { TouchableOpacityProps } from 'react-native';

export type ChipCategoryType = 'macro' | 'micro';
export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Rótulo textual do chip */
  label: string;
  /** Tipo da categoria: 'macro' determina fill sólido no estado selecionado, 'micro' determina fill tonal */
  categoryType?: ChipCategoryType;
  /** Tamanho do chip: 'sm' (28px), 'md' (36px), 'lg' (44px) */
  size?: ChipSize;
  /** Define se o chip está em estado selecionado */
  isSelected?: boolean;
  /** Define se o chip está desabilitado */
  disabled?: boolean;
  /** Rótulo de acessibilidade opcional. Se não passado, utiliza o próprio `label` */
  accessibilityLabel?: string;
  /** Função disparada ao pressionar o chip */
  onPress?: () => void;
}