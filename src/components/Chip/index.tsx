import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Insets,
} from 'react-native';
import { colors, palette } from '@/constants/colors';
import { ChipProps, ChipSize } from './types';

// Constantes de Mapeamento de Layout (Figma Tokens)
const CHIP_HEIGHTS: Record<ChipSize, number> = {
  sm: 28,
  md: 36,
  lg: 44,
};

const PADDING_HORIZONTAL: Record<ChipSize, number> = {
  sm: 12,
  md: 16,
  lg: 16,
};

// Offset de hitSlop para garantir a área de toque mínima de 44px
const HIT_SLOPS: Record<ChipSize, Insets> = {
  sm: { top: 8, bottom: 8, left: 0, right: 0 }, // 28 + 8 + 8 = 44px
  md: { top: 4, bottom: 4, left: 0, right: 0 }, // 36 + 4 + 4 = 44px
  lg: { top: 0, bottom: 0, left: 0, right: 0 }, // 44px
};

export function Chip({
  label,
  categoryType = 'macro',
  size = 'md',
  isSelected = false,
  disabled = false,
  accessibilityLabel,
  onPress,
  ...rest
}: ChipProps) {
  // Lógica de Determinação de Cores baseada nos Estados
  const getColors = (): { container: ViewStyle; text: TextStyle } => {
    if (disabled) {
      return {
        container: {
          backgroundColor: colors.bg.subtle ?? palette.neutral[200],
          borderColor: palette.neutral[300],
        },
        text: {
          color: colors.text.disabled ?? palette.neutral[400],
        },
      };
    }

    if (isSelected) {
      if (categoryType === 'macro') {
        // Macro selecionado: Fill Sólido
        return {
          container: {
            backgroundColor: colors.bg.base ?? palette.primary[600],
            borderColor: colors.bg.base ?? palette.primary[600],
          },
          text: {
            color: colors.text.primary ?? palette.primary[50],
          },
        };
      } else {
        // Micro selecionado: Fill Tonal
        return {
          container: {
            backgroundColor: colors.bg.subtle ?? palette.primary[100],
            borderColor: colors.bg.subtle ?? palette.primary[100],
          },
          text: {
            color: colors.text.primary ?? palette.primary[800],
          },
        };
      }
    }

    // Estado Padrão (Não Selecionado)
    return {
      container: {
        backgroundColor: colors.bg.base ?? palette.primary[50],
        borderColor: colors.border.default ?? palette.primary[300],
      },
      text: {
        color: colors.text.primary ?? palette.primary[800],
      },
    };
  };

  const dynamicColors = getColors();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      hitSlop={HIT_SLOPS[size]}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelected,
        disabled: disabled,
      }}
      accessibilityLabel={accessibilityLabel || label}
      style={[
        styles.container,
        {
          height: CHIP_HEIGHTS[size],
          paddingHorizontal: PADDING_HORIZONTAL[size],
        },
        dynamicColors.container,
      ]}
      {...rest}
    >
      <Text
        style={[styles.label, dynamicColors.text]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999, // Raio Full
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  label: {
    // Label S w600 (Escala Style Guide)
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
});