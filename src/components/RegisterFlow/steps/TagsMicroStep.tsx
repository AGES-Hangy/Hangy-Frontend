import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle } from '@/components/RegisterFlow/RegisterPieces';
import type { TagNode } from '@/hooks/useTags';

type Props = {
  tags: TagNode[];
  selectedMacroIds: string[];
  selectedMicroIds: string[];
  onToggleMicro: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  inlineError: string | null;
};

export function TagsMicroStep({
  tags,
  selectedMacroIds,
  selectedMicroIds,
  onToggleMicro,
  onSubmit,
  isSubmitting,
  inlineError,
}: Props) {
  const selectedMacros = tags.filter((tag) => selectedMacroIds.includes(tag.id));
  const canSubmit = selectedMicroIds.length > 0;

  return (
    <View style={styles.container}>
      <StepTitle>Agora afine o filtro</StepTitle>
      <Text style={styles.subtitle}>Dentro de cada área, marque o que você curte de verdade.</Text>

      {selectedMacros.map((macro) => (
        <View key={macro.id} style={styles.group}>
          <Text style={styles.groupLabel}>{macro.name.toUpperCase()}</Text>
          <View style={styles.chips}>
            {macro.children.map((leaf) => (
              <Chip
                key={leaf.id}
                label={leaf.name}
                categoryType="micro"
                isSelected={selectedMicroIds.includes(leaf.id)}
                onPress={() => onToggleMicro(leaf.id)}
              />
            ))}
          </View>
        </View>
      ))}

      {inlineError && <Text style={styles.error}>{inlineError}</Text>}

      <Button
        label="Concluir cadastro"
        onPress={onSubmit}
        disabled={!canSubmit}
        isLoading={isSubmitting}
        style={styles.button}
      />
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
  group: {
    gap: spacing[8],
  },
  groupLabel: {
    ...typography.labelS,
    color: colors.text.secondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
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
