import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Campos obrigatórios da etapa 1 que podem ficar pendentes. */
export type MissingField = 'title' | 'tags';

type ErrorSummaryProps = {
  /** Pendências atuais, derivadas do estado do formulário. */
  missing: MissingField[];
};

/** Segunda linha do resumo — também é o texto anunciado ao leitor de tela. */
export function describeMissing(missing: MissingField[]): string {
  const hasTitle = missing.includes('title');
  const hasTags = missing.includes('tags');

  if (hasTitle && hasTags) {
    return 'Preencha o nome e escolha pelo menos uma tag.';
  }
  if (hasTitle) {
    return 'Preencha o nome para o seu evento.';
  }
  return 'Escolha pelo menos uma tag.';
}

function describeCount(count: number): string {
  return count === 1 ? 'Falta 1 campo!' : `Faltam ${count} campos!`;
}

/**
 * Resumo de erros no topo do formulário, visível só quando houve tentativa de
 * avanço e ainda há pendência. É derivado do estado, não guardado: some
 * sozinho quando o usuário corrige os campos.
 */
export function ErrorSummary({ missing }: ErrorSummaryProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="circle-alert" size={20} color={colors.feedback.error} />
      <View style={styles.text}>
        <Text style={styles.title}>{describeCount(missing.length)}</Text>
        <Text style={styles.body}>{describeMissing(missing)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    backgroundColor: palette.error.bg,
    borderWidth: 1,
    borderColor: colors.feedback.error,
    borderRadius: radius.md,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  text: {
    flex: 1,
    gap: spacing[4],
  },
  title: {
    ...typography.labelM,
    color: colors.feedback.error,
  },
  body: {
    ...typography.bodyM,
    color: colors.feedback.error,
  },
});
