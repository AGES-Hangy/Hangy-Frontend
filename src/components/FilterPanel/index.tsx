import { useEffect, useMemo, useState } from 'react';
import { Modal as NativeModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { TagPickerGroup } from '@/components/TagPickerGroup';
import { TextField } from '@/components/TextField';
import type { TagLeaf, TagNode } from '@/hooks/useTags';
import { colors } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import {
  blockApplies,
  fromDateKey,
  normalizeFilterValue,
  toDateKey,
  validateDateRange,
} from '@/utils/searchFilters';
import type { DatePreset, DistanceKm, FilterPanelProps, FilterValue, ResultType } from './types';

const DATE_OPTIONS: { preset: DatePreset; label: string }[] = [
  { preset: 'today', label: 'Hoje' },
  { preset: 'tomorrow', label: 'Amanhã' },
  { preset: 'weekend', label: 'Este fim de semana' },
  { preset: 'custom', label: 'Escolher data' },
];

const RESULT_OPTIONS: { type: ResultType | undefined; label: string }[] = [
  { type: undefined, label: 'Tudo' },
  { type: 'events', label: 'Eventos' },
  { type: 'people', label: 'Pessoas' },
  { type: 'businesses', label: 'Estabelecimentos' },
];

const DISTANCE_OPTIONS: DistanceKm[] = [1, 5, 10, 25];

/** Nome de cada tipo no aviso "Não se aplica a ...". */
const RESULT_TYPE_NAMES: Record<ResultType, string> = {
  events: 'eventos',
  people: 'pessoas',
  businesses: 'estabelecimentos',
};

/** Mesma largura máxima do `Modal`: o Figma só diz "largura fluida" (361 no mock). */
const MAX_WIDTH = 420;

const isDraftEmpty = (draft: FilterValue) =>
  !draft.datePreset && !draft.resultType && !draft.maxDistanceKm && draft.tagIds.length === 0;

/**
 * Painel de filtros — FilterPanel da página Components. Card com data do
 * evento, tags macro/micro e o rodapé Limpar + Aplicar, aberto por cima da
 * tela. As mudanças ficam num rascunho até "Aplicar filtros"; fechar descarta.
 *
 * O componente é controlado: feche o painel (`visible={false}`) no `onApply`.
 *
 * ```tsx
 * <FilterPanel
 *   visible={open}
 *   value={filters}
 *   tags={tags}
 *   onApply={(next) => { setFilters(next); setOpen(false); }}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 */
export function FilterPanel({
  visible = false,
  variant = 'Search',
  value,
  onApply,
  onClear,
  onClose,
  tags,
  suggestedMicroTags,
  tagsLoading = false,
  tagsError,
  onRetryTags,
}: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterValue>(value);

  // Só ao abrir: depender de `value` zeraria o rascunho a cada render de uma
  // tela que monta o objeto inline.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible]);

  const isSearch = variant === 'Search';
  const resultType = isSearch ? draft.resultType : undefined;
  const dateApplies = blockApplies('date', resultType);
  const distanceApplies = blockApplies('distance', resultType);

  const rangeError =
    dateApplies && draft.datePreset === 'custom' ? validateDateRange(draft.dateFrom, draft.dateTo) : null;

  const visibleMicros = useMemo(
    () => getVisibleMicros(tags, draft.tagIds, suggestedMicroTags ?? []),
    [tags, draft.tagIds, suggestedMicroTags],
  );

  const update = (patch: Partial<FilterValue>) => setDraft((current) => ({ ...current, ...patch }));

  const toggleTag = (id: string) =>
    setDraft((current) => ({
      ...current,
      tagIds: current.tagIds.includes(id) ? current.tagIds.filter((t) => t !== id) : [...current.tagIds, id],
    }));

  // Desmarcar uma macro leva junto as micro dela, que somem da lista.
  const toggleMacro = (macro: TagNode) =>
    setDraft((current) => {
      if (!current.tagIds.includes(macro.id)) return { ...current, tagIds: [...current.tagIds, macro.id] };
      const childIds = new Set(macro.children.map((child) => child.id));
      return { ...current, tagIds: current.tagIds.filter((id) => id !== macro.id && !childIds.has(id)) };
    });

  const selectDatePreset = (preset: DatePreset) =>
    update(
      draft.datePreset === preset
        ? { datePreset: undefined, dateFrom: undefined, dateTo: undefined }
        : { datePreset: preset, dateFrom: undefined, dateTo: undefined },
    );

  const clear = () => {
    setDraft({ tagIds: [] });
    onClear?.();
  };

  const notAppliedHint = resultType ? `Não se aplica a ${RESULT_TYPE_NAMES[resultType]}.` : '';
  const today = fromDateKey(toDateKey(new Date()));

  return (
    <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessible={false} importantForAccessibility="no" />
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
          <View
            style={styles.card}
            role="dialog"
            accessibilityLabel="Filtros"
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                Filtros
              </Text>
              <IconButton icon="x" size="SM" variant="Ghost" accessibilityLabel="Fechar filtros" onPress={onClose} />
            </View>

            <ScrollView
              bounces={false}
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {isSearch && (
                <TagPickerGroup label="Mostrar">
                  {RESULT_OPTIONS.map((option) => (
                    <Chip
                      key={option.label}
                      label={option.label}
                      isSelected={draft.resultType === option.type}
                      onPress={() => update({ resultType: option.type })}
                    />
                  ))}
                </TagPickerGroup>
              )}

              <View style={styles.block}>
                <TagPickerGroup label="Data do evento">
                  {DATE_OPTIONS.map((option) => (
                    <Chip
                      key={option.preset}
                      label={option.label}
                      isSelected={dateApplies && draft.datePreset === option.preset}
                      disabled={!dateApplies}
                      onPress={() => selectDatePreset(option.preset)}
                    />
                  ))}
                </TagPickerGroup>

                {dateApplies && draft.datePreset === 'custom' && (
                  <View style={styles.dateRange}>
                    <TextField
                      type="Date"
                      label="De"
                      placeholder="dd/mm/aaaa"
                      dateValue={fromDateKey(draft.dateFrom)}
                      onChangeDate={(date) => update({ dateFrom: date ? toDateKey(date) : undefined })}
                      minimumDate={today}
                      error={rangeError?.field === 'dateFrom' ? rangeError.message : undefined}
                      reserveMessageSpace
                      accessibilityLabel="Data inicial"
                    />
                    <TextField
                      type="Date"
                      label="Até"
                      placeholder="dd/mm/aaaa"
                      dateValue={fromDateKey(draft.dateTo)}
                      onChangeDate={(date) => update({ dateTo: date ? toDateKey(date) : undefined })}
                      minimumDate={fromDateKey(draft.dateFrom) ?? today}
                      error={rangeError?.field === 'dateTo' ? rangeError.message : undefined}
                      reserveMessageSpace
                      accessibilityLabel="Data final"
                    />
                  </View>
                )}

                {/* Na busca, deixar claro que pessoas e estabelecimentos
                    continuam aparecendo — senão parece que a busca quebrou. */}
                {isSearch && (
                  <Text style={styles.hint}>
                    {dateApplies ? 'Aplica-se apenas aos resultados de eventos.' : notAppliedHint}
                  </Text>
                )}
              </View>

              {isSearch && (
                <View style={styles.block}>
                  <TagPickerGroup label="Distância">
                    {DISTANCE_OPTIONS.map((km) => (
                      <Chip
                        key={km}
                        label={`Até ${km} km`}
                        isSelected={distanceApplies && draft.maxDistanceKm === km}
                        disabled={!distanceApplies}
                        onPress={() => update({ maxDistanceKm: draft.maxDistanceKm === km ? undefined : km })}
                      />
                    ))}
                  </TagPickerGroup>
                  <Text style={styles.hint}>
                    {distanceApplies
                      ? 'A partir da sua localização. Aplica-se a eventos e estabelecimentos.'
                      : notAppliedHint}
                  </Text>
                </View>
              )}

              {tagsLoading ? (
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                  Carregando tags…
                </Text>
              ) : tagsError ? (
                <View style={styles.block}>
                  <Text style={styles.hint} accessibilityLiveRegion="polite">
                    {tagsError}
                  </Text>
                  {onRetryTags && (
                    <Button
                      label="Tentar de novo"
                      variant="Tertiary"
                      size="SM"
                      onPress={onRetryTags}
                      style={styles.retry}
                    />
                  )}
                </View>
              ) : (
                <>
                  <TagPickerGroup label="Tags macro">
                    {tags.map((macro) => (
                      <Chip
                        key={macro.id}
                        label={macro.name}
                        categoryType="macro"
                        isSelected={draft.tagIds.includes(macro.id)}
                        onPress={() => toggleMacro(macro)}
                      />
                    ))}
                  </TagPickerGroup>

                  <View style={styles.block}>
                    <TagPickerGroup label="Tags micro">
                      {visibleMicros.map((micro) => (
                        <Chip
                          key={micro.id}
                          label={micro.name}
                          categoryType="micro"
                          isSelected={draft.tagIds.includes(micro.id)}
                          onPress={() => toggleTag(micro.id)}
                        />
                      ))}
                    </TagPickerGroup>
                    <Text style={styles.hint}>
                      {visibleMicros.length > 0
                        ? 'As micro aparecem conforme as macro escolhidas.'
                        : 'Escolha uma tag macro para ver as micro.'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <Button label="Limpar" variant="Tertiary" disabled={isDraftEmpty(draft)} onPress={clear} />
              <Button
                label="Aplicar filtros"
                disabled={rangeError !== null}
                onPress={() => onApply(normalizeFilterValue(draft, variant))}
                style={styles.apply}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </NativeModal>
  );
}

/**
 * Micro listadas: as filhas das macro marcadas ou, sem macro, as sugeridas
 * (interesses do usuário). Micro já marcadas que não caem nesse grupo
 * continuam no fim da lista, para não sumirem marcadas.
 */
function getVisibleMicros(tags: TagNode[], selectedIds: string[], suggested: TagLeaf[]): TagLeaf[] {
  const selected = new Set(selectedIds);
  const selectedMacros = tags.filter((tag) => selected.has(tag.id));
  const base = selectedMacros.length > 0 ? selectedMacros.flatMap((macro) => macro.children) : suggested;

  const allMicros = new Map<string, TagLeaf>();
  for (const micro of [...tags.flatMap((tag) => tag.children), ...suggested]) allMicros.set(micro.id, micro);

  const result = new Map<string, TagLeaf>();
  for (const micro of base) result.set(micro.id, micro);
  for (const id of selectedIds) {
    const micro = allMicros.get(id);
    if (micro && !result.has(id)) result.set(id, micro);
  }
  return [...result.values()];
}

export type { FilterPanelProps, FilterPanelVariant, FilterValue } from './types';

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.inverse,
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[16],
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    maxHeight: '100%',
    flexShrink: 1,
    padding: spacing[16],
    gap: spacing[20],
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    ...elevation[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  title: {
    ...typography.h4,
    flex: 1,
    color: colors.text.primary,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: spacing[20],
  },
  block: {
    gap: spacing[8],
  },
  // Um campo embaixo do outro: lado a lado, cada um ficaria abaixo da largura
  // mínima de 280 do TextField e cortaria a data com fonte ampliada.
  dateRange: {
    gap: spacing[8],
  },
  hint: {
    ...typography.bodyS,
    alignSelf: 'stretch',
    color: colors.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  apply: {
    flex: 1,
  },
  retry: {
    alignSelf: 'flex-start',
  },
});
