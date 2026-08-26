import { View } from 'react-native';

import { colors } from '@/constants/colors';
import { icons } from '@/components/Icon/icons';
import type { IconProps } from '@/components/Icon/types';

/** Padrões do Figma — seção "Icons (Lucide)" da página Components. */
const DEFAULT_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Wrapper único dos ícones Lucide do Design System.
 *
 * Trava tamanho, traço e cor num padrão só, para que nenhuma tela importe
 * `lucide-react-native` direto. Renderiza SVG nativo via `react-native-svg`.
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
    // Os props de acessibilidade ficam na View, não no SVG: o lucide repassa o
    // que não conhece para o elemento nativo, e no web isso vira atributo DOM
    // inválido. A View também fixa o frame quadrado do Figma.
    //
    // `aria-hidden` em vez de accessibilityElementsHidden (iOS) +
    // importantForAccessibility (Android): o React Native mapeia ele para os
    // dois no nativo, e o react-native-web descarta aquele par sem traduzir —
    // o que deixava o ícone decorativo exposto ao leitor de tela no web.
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
        // O Figma trava cap/join em `round`; o lucide já entrega assim, mas
        // deixamos explícito para o traço não mudar se o pacote mudar o padrão.
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </View>
  );
}

export { icons } from '@/components/Icon/icons';
export type { IconName, IconProps } from '@/components/Icon/types';
