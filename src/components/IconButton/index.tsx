import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, icons } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from '@/components/IconButton/types';
import { colors, palette } from '@/constants/colors';
import { radius } from '@/constants/layout';

/**
 * Métricas por tamanho — seção IconButton da página Components do Figma:
 * círculo 52/44/36 com ícone 24/20/18.
 */
const SIZES = {
  LG: { diameter: 52, icon: 24 },
  MD: { diameter: 44, icon: 20 },
  SM: { diameter: 36, icon: 18 },
} as const satisfies Record<IconButtonSize, unknown>;

/**
 * Área de toque mínima. No tamanho SM o círculo tem 36 mas o toque precisa de
 * 44 — a diferença vai para `hitSlop`, sem aumentar o visual.
 */
const MIN_TOUCH_SIZE = 44;

/**
 * Opacidade aplicada ao pressionar. O Figma ainda não especifica o estado
 * Pressed do IconButton; quando especificar, troque por token em `VARIANTS`.
 */
const PRESSED_OPACITY = 0.85;

const BORDER_WIDTH = 1.5;

type Visual = {
  backgroundColor?: string;
  borderColor?: string;
  iconColor: string;
};

const VARIANTS: Record<IconButtonVariant, { default: Visual; disabled: Visual }> = {
  Filled: {
    default: { backgroundColor: colors.action.primary, iconColor: colors.text.inverse },
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
    // Sem fundo e sem borda.
    default: { iconColor: colors.text.primary },
    disabled: { iconColor: colors.text.disabled },
  },
};

/** Variantes desenhadas com contorno — borda 1.5 no Figma. */
const HAS_BORDER: ReadonlySet<IconButtonVariant> = new Set<IconButtonVariant>(['Outline']);

/**
 * `icon` aceita tanto o nome de um `Icon` quanto um `ReactNode`, e `ReactNode`
 * já inclui `string` — então só o teste de pertencimento ao mapa de ícones
 * distingue os dois casos.
 */
function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in icons;
}

/**
 * Botão circular sem label — 4 variantes e 3 tamanhos do Design System.
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
  onPress,
  style,
}: IconButtonProps) {
  const metrics = SIZES[size];
  const visual = disabled ? VARIANTS[variant].disabled : VARIANTS[variant].default;
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
        pressed && !disabled && { opacity: PRESSED_OPACITY },
        style,
      ]}
    >
      {isIconName(icon) ? (
        <Icon name={icon} size={metrics.icon} color={visual.iconColor} />
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
