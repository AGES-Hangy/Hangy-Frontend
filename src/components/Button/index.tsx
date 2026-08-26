import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, icons } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type { ButtonProps, ButtonSize, ButtonVariant } from '@/components/Button/types';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * Métricas por tamanho — seção Button da página Components do Figma:
 * altura 52/44/36, padding horizontal 24/20/16, label Label L/M/S.
 *
 * O Figma só especifica o ícone do tamanho LG (20). MD e SM seguem a mesma
 * proporção do label, um passo abaixo a cada tamanho.
 */
const SIZES = {
  LG: { height: 52, paddingHorizontal: spacing[24], label: typography.labelL, icon: 20 },
  MD: { height: 44, paddingHorizontal: spacing[20], label: typography.labelM, icon: 18 },
  SM: { height: 36, paddingHorizontal: spacing[16], label: typography.labelS, icon: 16 },
} as const satisfies Record<ButtonSize, unknown>;

/** Área de toque mínima exigida pelo guia de acessibilidade. */
const MIN_TOUCH_SIZE = 44;

/**
 * Opacidade aplicada ao pressionar as variantes que o Figma ainda não
 * especifica no estado Pressed (Accent, Tertiary e Danger). Primary e
 * Secondary usam os fills reais do Figma. Quando design definir esses
 * estados, troque a opacidade pelos tokens correspondentes.
 */
const PRESSED_OPACITY = 0.85;

type Visual = {
  backgroundColor?: string;
  borderColor?: string;
  contentColor: string;
};

type VariantVisuals = Record<'default' | 'pressed' | 'disabled', Visual>;

/** Fundo neutro compartilhado pelo estado Disabled (palette/neutral/200 no Figma). */
const DISABLED_FILL: Visual = {
  backgroundColor: palette.neutral[200],
  contentColor: colors.text.disabled,
};

const VARIANTS: Record<ButtonVariant, VariantVisuals> = {
  Primary: {
    default: { backgroundColor: colors.action.primary, contentColor: colors.text.inverse },
    pressed: { backgroundColor: colors.action.primaryPressed, contentColor: colors.text.inverse },
    disabled: DISABLED_FILL,
  },
  Secondary: {
    default: {
      backgroundColor: colors.bg.base,
      borderColor: colors.action.primary,
      contentColor: colors.text.brand,
    },
    pressed: {
      backgroundColor: palette.primary[50],
      borderColor: colors.action.primary,
      contentColor: colors.text.brand,
    },
    disabled: {
      backgroundColor: colors.bg.base,
      borderColor: colors.border.strong,
      contentColor: colors.text.disabled,
    },
  },
  Accent: {
    default: { backgroundColor: colors.action.secondary, contentColor: colors.text.primary },
    pressed: { backgroundColor: colors.action.secondary, contentColor: colors.text.primary },
    disabled: DISABLED_FILL,
  },
  Tertiary: {
    // Só texto: sem fundo e sem borda.
    default: { contentColor: palette.primary[600] },
    pressed: { contentColor: palette.primary[600] },
    disabled: { contentColor: colors.text.disabled },
  },
  Danger: {
    default: { backgroundColor: colors.action.danger, contentColor: colors.text.inverse },
    pressed: { backgroundColor: colors.action.danger, contentColor: colors.text.inverse },
    disabled: DISABLED_FILL,
  },
};

/** Variantes cujo Pressed o Figma define com fill próprio, em vez de opacidade. */
const HAS_PRESSED_FILL: ReadonlySet<ButtonVariant> = new Set<ButtonVariant>(['Primary', 'Secondary']);

/** Variantes desenhadas com contorno — borda 1.5 no Figma. */
const HAS_BORDER: ReadonlySet<ButtonVariant> = new Set<ButtonVariant>(['Secondary']);

const BORDER_WIDTH = 1.5;

function resolveVisual(variant: ButtonVariant, disabled: boolean, pressed: boolean): Visual {
  if (disabled) return VARIANTS[variant].disabled;
  return pressed ? VARIANTS[variant].pressed : VARIANTS[variant].default;
}

/**
 * `icon` aceita tanto o nome de um `Icon` quanto um `ReactNode`, e `ReactNode`
 * já inclui `string` — então só o teste de pertencimento ao mapa de ícones
 * distingue os dois casos.
 */
function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && value in icons;
}

/**
 * Botão base do app — 5 variantes, 3 tamanhos e 4 estados do Design System.
 *
 * ```tsx
 * <Button label="Criar evento" icon="plus" onPress={criarEvento} />
 * <Button label="Cancelar presença" variant="Danger" size="MD" />
 * <Button label="Entrar" isLoading={isLoading} />
 * ```
 */
export function Button({
  label,
  variant = 'Primary',
  size = 'LG',
  icon,
  disabled = false,
  isLoading = false,
  onPress,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const metrics = SIZES[size];
  const isBlocked = disabled || isLoading;
  const verticalHitSlop = Math.max(0, (MIN_TOUCH_SIZE - metrics.height) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={isBlocked}
      hitSlop={{ top: verticalHitSlop, bottom: verticalHitSlop }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isBlocked, busy: isLoading }}
      style={({ pressed }) => {
        const visual = resolveVisual(variant, disabled, pressed);

        return [
          styles.base,
          {
            height: metrics.height,
            paddingHorizontal: metrics.paddingHorizontal,
            backgroundColor: visual.backgroundColor,
          },
          HAS_BORDER.has(variant) && {
            borderWidth: BORDER_WIDTH,
            borderColor: visual.borderColor,
          },
          pressed && !disabled && !HAS_PRESSED_FILL.has(variant) && { opacity: PRESSED_OPACITY },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const visual = resolveVisual(variant, disabled, pressed);

        return (
          <>
            {/* O conteúdo continua ocupando espaço no estado Loading para o
                botão não encolher e fazer a tela pular. */}
            <View style={[styles.content, isLoading && styles.contentHidden]}>
              {isIconName(icon) ? (
                <Icon name={icon} size={metrics.icon} color={visual.contentColor} />
              ) : (
                icon
              )}

              <Text style={[metrics.label, { color: visual.contentColor }]} numberOfLines={1}>
                {label}
              </Text>
            </View>

            {isLoading && (
              <View style={styles.spinner} pointerEvents="none">
                <ActivityIndicator size="small" color={visual.contentColor} />
              </View>
            )}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  contentHidden: {
    opacity: 0,
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type { ButtonProps, ButtonSize, ButtonVariant } from '@/components/Button/types';
