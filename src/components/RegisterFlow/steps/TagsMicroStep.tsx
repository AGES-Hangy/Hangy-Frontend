import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle } from '@/components/RegisterFlow/RegisterPieces';
import type { TagNode } from '@/hooks/useTags';
import type { AccountType } from '@/components/RegisterFlow/types';

const COPY = {
  pf: {
    title: 'Agora afine o filtro',
    subtitle: 'Dentro de cada área, marque o que você curte de verdade.',
  },
  pj: {
    title: 'Agora especifique',
    subtitle: 'Dentro de cada área, marque os tipos de evento que você vai oferecer.',
  },
} as const;

type Props = {
  accountType: AccountType;
  tags: TagNode[];
  selectedMacroIds: string[];
  selectedMicroIds: string[];
  onToggleMicro: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  inlineError: string | null;
};

export function TagsMicroStep({
  accountType,
  tags,
  selectedMacroIds,
  selectedMicroIds,
  onToggleMicro,
  onBack,
  onSubmit,
  isSubmitting,
  inlineError,
}: Props) {
  const { title, subtitle } = COPY[accountType];
  const selectedMacros = tags.filter((tag) => selectedMacroIds.includes(tag.id));
  const canSubmit = selectedMicroIds.length > 0;

  return (
    <View style={styles.container}>
      <StepTitle>{title}</StepTitle>
      <Text style={styles.subtitle}>{subtitle}</Text>

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
                disabled={isSubmitting}
              />
            ))}
          </View>
        </View>
      ))}

      {inlineError && <Text style={styles.error}>{inlineError}</Text>}

      <Button label="Voltar" variant="Tertiary" onPress={onBack} disabled={isSubmitting} />
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
