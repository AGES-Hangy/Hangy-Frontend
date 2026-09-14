import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { TagNode } from '@/hooks/useTags';

import { MAX_TAGS } from '@/components/CreateEvent/types';


const SKELETON_PILL_HEIGHT = 36;
const SKELETON_SECTIONS = [0, 1, 2];
const SKELETON_PILLS = [0, 1, 2, 3];

type TagPickerProps = {
  tags: TagNode[];
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];
  showError: boolean;
  onToggle: (id: string) => void;
  onRetry: () => void;
};
/**
 * A tag macro (ex.: "Esportes") só aparece como cabeçalho da seção — não dá
 * pra selecioná-la. É assim no Figma, e bate com o próprio backend: quem
 * cria o evento escolhe tags micro (ex.: "Futebol"), e é a API quem sobe
 * isso pra categoria macro na Home (`FeedService._group_by_macro_tag`).
 */
export function TagPicker({
  tags,
  isLoading,
  error,
  selectedIds,
  showError,
  onToggle,
  onRetry,
}: TagPickerProps) {
  const limitReached = selectedIds.length >= MAX_TAGS;

  const chipLabel = (name: string, isSelected: boolean) =>
    !isSelected && limitReached ? `${name}, limite de ${MAX_TAGS} tags atingido` : name;

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          Tags
          <Text style={styles.asterisk}> *</Text>
        </Text>
        <Text style={styles.hint}>Até 5</Text>
      </View>

      {showError && !error? (
        <View style={styles.errorLine}>
          <Icon name="circle-alert" size={16} color={colors.feedback.error} />
          <Text style={styles.errorLineText}>Escolha de 1 a 5 tags.</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SKELETON_SECTIONS.map((section) => (
            <View key={section} style={styles.section}>
              <View style={styles.skeletonHeader} />
              <View style={styles.chipRow}>
                {SKELETON_PILLS.map((pill) => (
                  <View key={pill} style={styles.skeletonPill} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.loadError}>
          <View style={styles.loadErrorRow}>
            <Icon name="circle-alert" size={16} color={colors.feedback.error} />
            <Text style={styles.loadErrorText}>Não foi possível carregar as tags.</Text>
          </View>
          <Button
            label="Tentar de novo"
            variant="Tertiary"
            size="SM"
            onPress={onRetry}
          />
        </View>
      ) : (
        tags.map((macro) => {
          return (
            <View key={macro.id} style={styles.section}>
              <Text style={styles.sectionHeader}>{macro.name.toUpperCase()}</Text>
              <View style={styles.chipRow}>
                {macro.children.map((micro) => {
                  const isSelected = selectedIds.includes(micro.id);
                  return (
                    <Chip
                      key={micro.id}
                      label={micro.name}
                      categoryType="micro"
                      size="md"
                      isSelected={isSelected}
                      showRemoveIcon={isSelected}
                      disabled={!isSelected && limitReached}
                      onPress={() => onToggle(micro.id)}
                      onRemove={() => onToggle(micro.id)}
                      accessibilityLabel={chipLabel(micro.name, isSelected)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  label: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  asterisk: {
    ...typography.labelM,
    color: colors.feedback.error,
  },
  hint: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  errorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  errorLineText: {
    ...typography.bodyS,
    color: colors.feedback.error,
  },
  section: {
    marginBottom: spacing[16],
  },
  sectionHeader: {
    ...typography.overline,
    color: colors.text.secondary,
    marginBottom: spacing[8],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  skeletonHeader: {
    width: '40%',
    height: typography.overline.lineHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.surface.sunken,
    marginBottom: spacing[8],
  },
  skeletonPill: {
    width: '28%',
    height: SKELETON_PILL_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  loadError: {
  gap: spacing[8],
  alignItems: 'flex-start',
},
loadErrorRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing[8],
},
loadErrorText: {
  ...typography.bodyM,
  color: colors.feedback.error,
},
});
