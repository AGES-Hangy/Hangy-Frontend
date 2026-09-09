import { Pressable, StyleSheet, View } from 'react-native';

import type { SwitchProps } from '@/components/Switch/types';
import { colors, palette } from '@/constants/colors';
import { radius } from '@/constants/layout';

/**
 * Métricas fixas — seção Switch da página Components do Figma:
 * trilho 48×28 raio full, knob 22×22. `State` é o único eixo de variante.
 */
const TRACK = { width: 48, height: 28 } as const;
const KNOB_SIZE = 22;
const KNOB_INSET = (TRACK.height - KNOB_SIZE) / 2; // 3
const KNOB_TRAVEL = TRACK.width - KNOB_SIZE - KNOB_INSET * 2; // 20

/** Área de toque mínima, mesmo padrão do IconButton. */
const MIN_TOUCH_SIZE = 44;

type Visual = { trackColor: string };

const VARIANTS: Record<'on' | 'off', { default: Visual; disabled: Visual }> = {
  on: {
    default: { trackColor: colors.action.primary },
    disabled: { trackColor: palette.neutral[200] },
  },
  off: {
    default: { trackColor: colors.border.strong },
    disabled: { trackColor: palette.neutral[200] },
  },
};

/**
 * Switch (trilho + knob) — controlado por quem usa, mesmo padrão de outros
 * inputs do Design System.
 *
 * ```tsx
 * <Switch checked={enabled} onChange={setEnabled} accessibilityLabel="Notificações" />
 * ```
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  accessibilityLabel,
  style,
}: SwitchProps) {
  const visual = disabled
    ? VARIANTS[checked ? 'on' : 'off'].disabled
    : VARIANTS[checked ? 'on' : 'off'].default;

  const hitSlopVertical = Math.max(0, (MIN_TOUCH_SIZE - TRACK.height) / 2);

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      hitSlop={{ top: hitSlopVertical, bottom: hitSlopVertical }}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      style={[styles.track, { backgroundColor: visual.trackColor }, style]}
    >
      <View
        style={[
          styles.knob,
          { left: checked ? KNOB_INSET + KNOB_TRAVEL : KNOB_INSET },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK.width,
    height: TRACK.height,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.bg.base,
  },
});

export type { SwitchProps } from '@/components/Switch/types';