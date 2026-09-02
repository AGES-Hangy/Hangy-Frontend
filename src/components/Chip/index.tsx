import React from 'react';
import {
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Insets,
} from 'react-native';
import { colors } from '@/constants/colors';
import { typography, fontFamily } from '@/constants/typography';
import { ChipProps, ChipSize } from './types';
import { radius } from '@/constants/layout';
import { Icon } from '../Icon';

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

const HIT_SLOPS: Record<ChipSize, Insets> = {
  sm: { top: 8, bottom: 8, left: 0, right: 0 },
  md: { top: 4, bottom: 4, left: 0, right: 0 },
  lg: { top: 0, bottom: 0, left: 0, right: 0 },
};

type ChipDynamicStyles = {
  container: ViewStyle;
  text: TextStyle;
  badgeText: TextStyle;
};

export function Chip({
  label,
  categoryType = 'macro',
  size = 'md',
  isSelected = false,
  disabled = false,
  badgeCount,
  showRemoveIcon = false,
  onRemove,
  accessibilityLabel,
  onPress,
  ...rest
}: ChipProps) {
  const getColors = (): ChipDynamicStyles => {
    // 1. Estado Desabilitado
    if (disabled) {
      return {
        container: {
          backgroundColor: colors.surface.sunken, 
          borderColor: colors.border.default,     
        },
        text: { color: colors.text.disabled },
        badgeText: { color: colors.text.disabled },
      };
    }

    // 2. Estado Selecionado
    if (isSelected) {
      if (categoryType === 'macro') {
        return {
          container: {
            backgroundColor: colors.action.primary,
            borderColor: colors.border.focus,
          },
          text: { color: colors.text.inverse },
          badgeText: { color: colors.text.inverse },
        };
      } else {
        return {
          container: {
            backgroundColor: colors.surface.sunken,
            borderColor: colors.border.focus,
          },
          text: { color: colors.text.brand },
          badgeText: { color: colors.text.brand },
        };
      }
    }

    // 3. Estado Padrão Não Selecionado
    return {
      container: {
        backgroundColor: colors.surface.card,
        borderColor: colors.border.strong,
      },
      text: { color: colors.text.primary },
      badgeText: { color: colors.text.secondary },
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
      // style é definido internamente. Qualquer override indesejado pelo {...rest}
      // agora é bloqueado pela tipagem Omit<..., 'style'>
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
      <Text style={[styles.label, dynamicColors.text]} numberOfLines={1}>
        {label}
      </Text>

      {/* Contador numérico (Sem borda/fundo) */}
      {typeof badgeCount === 'number' && (
        <Text style={[styles.badgeText, dynamicColors.badgeText]}>
          {badgeCount}
        </Text>
      )}

      {/* Ícone de Remover - Usando Pressable e Role="none" para evitar nested buttons */}
      {showRemoveIcon && isSelected && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="none"
          accessibilityLabel={`Remover ${label}`}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1, // Simula o efeito do antigo activeOpacity={0.6}
          })}
        >
          <Icon name="x" size={14} color={dynamicColors.badgeText.color as string} />
        </Pressable>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8, 
  },
  label: {
    ...typography.labelS,
    fontFamily: fontFamily.base,
    textAlign: 'center',
  },
  badgeText: {
    ...typography.labelS,
    fontFamily: fontFamily.base,
    textAlign: 'center',
  },
});