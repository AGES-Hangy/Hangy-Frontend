import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

type SectionEmptyStateProps = {
  icon: IconName;
  title: string;
  text: string;
};

const ILLUSTRATION_SIZE = 40;

/**
 * Estado vazio de uma seção dentro de uma lista maior. É a versão compacta do
 * `EmptyState`: mesma ilustração em primary/100, mas em linha e sem ocupar a
 * tela — a seção mantém o cabeçalho e diz o que aparece ali.
 */
export function SectionEmptyState({ icon, title, text }: SectionEmptyStateProps) {
  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${text}`}>
      <View style={styles.illustration} aria-hidden>
        <Icon name={icon} size={20} color={colors.action.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
  },
  illustration: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    borderRadius: radius.full,
    backgroundColor: palette.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing[4],
  },
  title: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  text: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});
