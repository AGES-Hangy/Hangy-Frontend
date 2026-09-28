import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle } from '@/components/RegisterFlow/RegisterPieces';
import type { TagNode } from '@/hooks/useTags';

const MINIMUM_MACRO_TAGS = 3;

type Props = {
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
export function TagsMacroStep({ tags, isLoading, error, selectedMacroIds, onToggleMacro, onContinue, onRetry }: Props) {
  const availableSelection = selectedMacroIds.filter((id) => tags.some((tag) => tag.id === id));
  const canContinue = !isLoading && !error && availableSelection.length >= MINIMUM_MACRO_TAGS;

  return (
    <View style={styles.container}>
      <StepTitle>O que te interessa?</StepTitle>
      <Text style={styles.subtitle}>
        Escolha ao menos {MINIMUM_MACRO_TAGS} áreas. O feed da Home é montado a partir delas.
      </Text>

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
