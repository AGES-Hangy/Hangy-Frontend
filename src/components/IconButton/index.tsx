import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, icons } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from '@/components/IconButton/types';
import { colors, palette } from '@/constants/colors';
import { pressedOpacity, radius } from '@/constants/layout';

/**
 * Métricas da seção IconButton na página Components do Figma:
 * círculo 52/44/36 com ícone 24/20/18. O badge de câmera do `PhotoTile`
 * também usa esses diâmetros.
 */
export const ICON_BUTTON_SIZES = {
  LG: { diameter: 52, icon: 24 },
  MD: { diameter: 44, icon: 20 },
  SM: { diameter: 36, icon: 18 },
} as const satisfies Record<IconButtonSize, unknown>;

/**
 * No tamanho SM, `hitSlop` amplia o alvo de toque de 36 para 44 sem aumentar o círculo.
 */
const MIN_TOUCH_SIZE = 44;

const BORDER_WIDTH = 1.5;

type Visual = {
  backgroundColor?: string;
  borderColor?: string;
  iconColor: string;
  /** Cor do ícone cheio (`iconFilled`), no traço e no preenchimento; sem valor, usa `iconColor`. */
  filledIconColor?: string;
};

const VARIANTS: Record<IconButtonVariant, { default: Visual; disabled: Visual }> = {
  Filled: {
    // O ícone cheio repete o fundo do Tonal: o toggle ativo é o inverso do inativo.
    default: {
      backgroundColor: colors.action.primary,
      iconColor: colors.text.inverse,
      filledIconColor: palette.primary[100],
    },
    disabled: { backgroundColor: palette.neutral[200], iconColor: colors.text.disabled },
  },
  Tonal: {
    default: { backgroundColor: palette.primary[100], iconColor: palette.primary[700] },
    disabled: { backgroundColor: palette.neutral[200], iconColor: colors.text.disabled },
  },
  Outline: {
    default: {
      backgroundColor: colors.bg.base,
      borderColor: colors.border.strong,
      iconColor: colors.text.primary,
    },
    disabled: {
      backgroundColor: colors.bg.base,
      borderColor: colors.border.strong,
      iconColor: colors.text.disabled,
    },
  },
  Ghost: {
    default: { iconColor: colors.text.primary },
    disabled: { iconColor: colors.text.disabled },
  },
};

/** Variantes com contorno de 1.5 no Figma. */
const HAS_BORDER: ReadonlySet<IconButtonVariant> = new Set<IconButtonVariant>(['Outline']);

/**
 * Distingue nomes de ícones de elementos React e restringe o tipo a `IconName`.
 */
function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in icons;
}

/**
 * Botão circular sem texto, com 4 variantes e 3 tamanhos do Design System.
 *
 * ```tsx
 * <IconButton icon="arrow-left" accessibilityLabel="Voltar" />
 * <IconButton icon="share" accessibilityLabel="Compartilhar" variant="Tonal" size="LG" />
 * ```
 */
export function IconButton({
  icon,
  accessibilityLabel,
  variant = 'Ghost',
  size = 'MD',
  disabled = false,
  iconFilled = false,
  onPress,
  style,
}: IconButtonProps) {
  const metrics = ICON_BUTTON_SIZES[size];
  const visual = disabled ? VARIANTS[variant].disabled : VARIANTS[variant].default;
  const iconColor = iconFilled ? (visual.filledIconColor ?? visual.iconColor) : visual.iconColor;
  const hitSlop = Math.max(0, (MIN_TOUCH_SIZE - metrics.diameter) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        {
          width: metrics.diameter,
          height: metrics.diameter,
          backgroundColor: visual.backgroundColor,
        },
        HAS_BORDER.has(variant) && {
          borderWidth: BORDER_WIDTH,
          borderColor: visual.borderColor,
        },
        pressed && !disabled && { opacity: pressedOpacity },
        style,
      ]}
    >
      {isIconName(icon) ? (
        <Icon
          name={icon}
          size={metrics.icon}
          color={iconColor}
          fill={iconFilled ? iconColor : 'none'}
        />
      ) : (
        <View style={{ width: metrics.icon, height: metrics.icon }}>{icon}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});

export type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from '@/components/IconButton/types';
