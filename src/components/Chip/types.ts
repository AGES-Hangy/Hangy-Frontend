import { TouchableOpacityProps } from 'react-native';

export type ChipSize = 'sm' | 'md' | 'lg';

export type ChipCategoryType = 'macro' | 'micro';

export interface ChipProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  categoryType?: ChipCategoryType;
  size?: ChipSize;
  isSelected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  badgeCount?: number;
  showRemoveIcon?: boolean;
  onRemove?: () => void;
}