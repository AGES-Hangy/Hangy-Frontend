import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Switch } from '@/components/Switch';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Borda 1.5 do frame, a mesma dos campos e chips do Design System. */
const BORDER_WIDTH = 1.5;
const ICON_SIZE = 24;
/** Completa os 44 de alvo de toque do link (Label S tem 16 de altura). */
const ACTION_HIT_SLOP = { top: 14, bottom: 14, left: spacing[8], right: spacing[8] };

/** Eixo `State` do Figma. `Blocked`: a preferência depende de algo fora do app. */
export type SettingsRowState = 'On' | 'Off' | 'Blocked';

export type SettingsRowProps = {
  icon: IconName;
  title: string;
  /** Texto de apoio dos estados `On` e `Off`. */
  description: string;
  state: SettingsRowState;
  /** Chamado ao tocar no Switch, já com o novo valor. */
  onToggle: (checked: boolean) => void;
  /** Bloqueia o Switch (ex.: ação em voo) sem mudar o estado exibido. */
  disabled?: boolean;
  /** `Blocked`: texto no lugar de `description`. */
  blockedDescription?: string;
  /** `Blocked`: link abaixo do texto (ex.: "Abrir ajustes"). */
  actionLabel?: string;
  onActionPress?: () => void;
};

/**
 * Linha de preferência com Switch — SettingsRow da Sprint 3 Components.
 *
 * ```tsx
 * <SettingsRow
 *   icon="bell"
 *   title="Notificações push"
 *   description="Convites, mensagens e eventos"
 *   state={enabled ? 'On' : 'Off'}
 *   onToggle={toggle}
 * />
 * ```
 */
export function SettingsRow({
  icon,
  title,
  description,
  state,
  onToggle,
  disabled = false,
  blockedDescription,
  actionLabel,
  onActionPress,
}: SettingsRowProps) {
  const isBlocked = state === 'Blocked';

  return (
    <View style={styles.container}>
      <Icon name={icon} size={ICON_SIZE} color={colors.text.primary} />

      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          {isBlocked ? blockedDescription ?? description : description}
        </Text>
        {isBlocked && actionLabel && (
          <Pressable
            onPress={onActionPress}
            hitSlop={ACTION_HIT_SLOP}
            accessibilityRole="link"
            accessibilityLabel={actionLabel}
            style={styles.action}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>

      <Switch
        checked={state === 'On'}
        onChange={onToggle}
        disabled={disabled}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderWidth: BORDER_WIDTH,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  title: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  action: {
    alignSelf: 'flex-start',
  },
  actionLabel: {
    ...typography.labelS,
    color: palette.primary[600],
  },
});
