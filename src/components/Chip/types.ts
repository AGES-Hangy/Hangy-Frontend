import { TouchableOpacityProps } from 'react-native';

export type ChipSize = 'sm' | 'md' | 'lg';

export interface ChipProps extends TouchableOpacityProps {
  label: string;
  categoryType?: 'macro' | 'micro';
  size?: ChipSize;
  isSelected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  badgeCount?: number;
  showRemoveIcon?: boolean;
  onRemove?: () => void;
}