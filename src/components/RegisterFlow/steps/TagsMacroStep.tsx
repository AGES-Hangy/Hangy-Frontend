import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle } from '@/components/RegisterFlow/RegisterPieces';
import type { TagNode } from '@/hooks/useTags';
import type { AccountType } from '@/components/RegisterFlow/types';

/**
 * Pessoa Física escolhe o que a interessa (o feed é montado a partir disso, daí
 * o mínimo de 3); a empresa escolhe as áreas dos eventos que vai oferecer, e
 * pode atuar em uma só.
 */
const COPY = {
  pf: {
    minimum: 3,
    title: 'O que te interessa?',
    subtitle: (minimum: number) => `Escolha ao menos ${minimum} áreas. O feed da Home é montado a partir delas.`,
  },
  pj: {
    minimum: 1,
    title: 'Que eventos você vai oferecer?',
    subtitle: () => 'Escolha as áreas dos eventos da sua empresa. Elas ajudam as pessoas a encontrarem você.',
  },
} as const;

type Props = {
  accountType: AccountType;
  tags: TagNode[];
  isLoading: boolean;
  error: string | null;
  selectedMacroIds: string[];
  onToggleMacro: (id: string) => void;
  onContinue: () => void;
  onRetry: () => void;
};

/**
 * "O que te interessa?" — o Figma (nó 1693:90) mostra seleção múltipla de
 * macro categorias com contador e mínimo de 3, não uma navegação de toque
 * único como a tabela de estados da task descreve em prosa; sigo o frame,
 * que é mais concreto (ver divergência registrada no plano/PR).
 */
export function TagsMacroStep({ accountType, tags, isLoading, error, selectedMacroIds, onToggleMacro, onContinue, onRetry }: Props) {
  const { minimum, title, subtitle } = COPY[accountType];
  const availableSelection = selectedMacroIds.filter((id) => tags.some((tag) => tag.id === id));
  const canContinue = !isLoading && !error && availableSelection.length >= minimum;

  return (
    <View style={styles.container}>
      <StepTitle>{title}</StepTitle>
      <Text style={styles.subtitle}>{subtitle(minimum)}</Text>

      {error && (
        <>
          <Text style={styles.error}>{error}</Text>
          <Button label="Tentar novamente" variant="Secondary" onPress={onRetry} disabled={isLoading} />
        </>
      )}

      <View style={styles.chips}>
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            categoryType="macro"
            isSelected={selectedMacroIds.includes(tag.id)}
            onPress={() => onToggleMacro(tag.id)}
            disabled={isLoading}
          />
        ))}
      </View>

      <Text style={styles.counter}>
        {selectedMacroIds.length} de {tags.length} selecionadas
      </Text>

      <Button label="Continuar" onPress={onContinue} disabled={!canContinue} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[16],
  },
  subtitle: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  counter: {
    ...typography.bodyS,
    color: palette.neutral[400],
  },
  button: {
    marginTop: spacing[8],
    alignSelf: 'center',
  },
  error: {
    ...typography.bodyS,
    color: colors.feedback.error,
  },
});
