import { View } from 'react-native';

import { colors } from '@/constants/colors';
import { icons } from '@/components/Icon/icons';
import type { IconProps } from '@/components/Icon/types';

/** Padrões da seção "Icons (Lucide)" na página Components do Figma. */
const DEFAULT_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Ícones Lucide com os valores padrão de tamanho, traço e cor do Design System.
 * Use este componente nas telas. Ele renderiza SVG nativo via `react-native-svg`.
 *
 * ```tsx
 * <Icon name="bell" />
 * <Icon name="star" fill={colors.action.secondary} color={colors.action.secondary} />
 * ```
 */
export function Icon({
  name,
  size = DEFAULT_SIZE,
  color = colors.text.primary,
  fill = 'none',
  strokeWidth = DEFAULT_STROKE_WIDTH,
  absoluteStrokeWidth = false,
  accessibilityLabel,
}: IconProps) {
  const LucideIcon = icons[name];
  const isDecorative = accessibilityLabel === undefined;

  return (
    // A View recebe os props de acessibilidade e fixa o frame quadrado do Figma.
    // No SVG, esses props virariam atributos DOM inválidos na Web.
    // `aria-hidden` oculta ícones decorativos na Web e no nativo; o RN Web não
    // traduz `accessibilityElementsHidden` e `importantForAccessibility`.
    <View
      style={{ width: size, height: size }}
      aria-hidden={isDecorative || undefined}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
    >
      <LucideIcon
        size={size}
        color={color}
        fill={fill}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth={absoluteStrokeWidth}
        // Mantém cap/join em `round`, como no Figma, mesmo se o padrão do Lucide mudar.
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </View>
  );
}

export { icons } from '@/components/Icon/icons';
export type { IconName, IconProps } from '@/components/Icon/types';
