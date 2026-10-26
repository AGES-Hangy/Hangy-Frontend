import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Ícone do Figma: 14, um passo acima da altura-x do Body S. */
const ICON_SIZE = 14;

export type FieldHintProps = {
  /** Texto de apoio, ex.: "O CPF não pode ser alterado." */
  text: string;
  /** Padrão: cadeado, o caso do campo bloqueado. */
  icon?: IconName;
};

/**
 * Dica abaixo de um campo (ícone + texto) — FieldHint da Sprint 3 Components.
 * Usada nos campos que aparecem desabilitados em vez de escondidos.
 *
 * ```tsx
 * <FieldHint text="O CPF não pode ser alterado." />
 * ```
 */
export function FieldHint({ text, icon = 'lock' }: FieldHintProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={ICON_SIZE} color={colors.text.tertiary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  text: {
    ...typography.bodyS,
    flex: 1,
    color: colors.text.tertiary,
  },
});
