import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { FileUpload } from '@/components/FileUpload';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useEditEvent } from '@/hooks/useEditEvent';
import { useEvent } from '@/hooks/useEvent';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTags } from '@/hooks/useTags';
import { useTopAppBar } from '@/hooks/useTopAppBar';

import { TagPicker } from '@/components/CreateEvent/TagPicker';
import { MAX_TAGS } from '@/components/CreateEvent/types';
import type { EventDetail } from '@/types/event';

type EditEventFormData = {
  title: string;
  description: string;
  coverUri: string | null;
  date: Date | null;
  time: Date | null;
  location: string;
  tagIds: string[];
};

type MissingField = 'title' | 'dateRow' | 'location' | 'tags';

const SCROLL_MARGIN = spacing[16];

function toFormData(event: EventDetail): EditEventFormData {
  const eventDate = new Date(event.event_date);
  return {
    title: event.title,
    description: event.description,
    coverUri: event.cover_photo_url,
    date: eventDate,
    time: eventDate,
    location: event.location_name,
    tagIds: event.tags.map((tag) => tag.id),
  };
}

function isFutureDate(date: Date | null, time: Date | null): boolean {
  if (!date || !time) return true;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined.getTime() > Date.now();
}

function validate(form: EditEventFormData): MissingField[] {
  const missing: MissingField[] = [];
  if (form.title.trim().length === 0) missing.push('title');
  if (!form.date || !form.time || !isFutureDate(form.date, form.time)) missing.push('dateRow');
  if (form.location.trim().length === 0) missing.push('location');
  if (form.tagIds.length === 0) missing.push('tags');
  return missing;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={[typography.labelM, styles.fieldLabel]}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

/**
 * Edição de evento — reaproveita os campos da criação (US3.2/3.3), mas numa
 * tela só: o `PATCH /events/{id}` do backend (`UpdateEventInput`) não aceita
 * `max_participants` nem `privacy`, então esses dois controles do Step2 não
 * entram aqui — não tem como o back-end honrar a mudança.
 *
 * Tags fica por último de propósito (pedido do time): nas outras telas de
 * evento ela fecha o formulário, então a edição segue o mesmo fluxo de leitura.
 */
export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const containerRef = useRef<View>(null);
  const titleRef = useRef<View>(null);
  const dateRowRef = useRef<View>(null);
  const locationRef = useRef<View>(null);
  const tagsRef = useRef<View>(null);

  const { event, isLoading: isLoadingEvent, error: eventError, reload } = useEvent(id);
  const { saveEvent, isSaving, saveError } = useEditEvent(id);
  const { tags, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } = useTags();
  const { pickImage, error: coverError } = useImageUpload();

  const [form, setForm] = useState<EditEventFormData | null>(null);
  const originalRef = useRef<EditEventFormData | null>(null);
  const durationMsRef = useRef(2 * 60 * 60 * 1000);
  const [submitCount, setSubmitCount] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Só na primeira carga: sem isto, o refetch do `useEvent` no foco (ex.:
  // voltar de um seletor) apagaria o que a pessoa já tinha digitado.
  useEffect(() => {
    if (event && !form) {
      const initial = toFormData(event);
      setForm(initial);
      originalRef.current = initial;
      durationMsRef.current =
        new Date(event.end_date).getTime() - new Date(event.event_date).getTime();
    }
  }, [event, form]);

  const hasChanges = Boolean(
    form && originalRef.current && JSON.stringify(form) !== JSON.stringify(originalRef.current),
  );

  function handleBack() {
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    router.back();
  }

  useTopAppBar({
    variant: 'Modal',
    title: 'Editar evento',
    onBack: handleBack,
  });

  const missing = form ? validate(form) : [];
  const submitAttempted = submitCount > 0;
  const showSummary = submitAttempted && missing.length > 0;

  const fieldRefs: Record<MissingField, React.RefObject<View | null>> = {
    title: titleRef,
    dateRow: dateRowRef,
    location: locationRef,
    tags: tagsRef,
  };

  useEffect(() => {
    if (submitCount === 0 || missing.length === 0) return;

    const messages: string[] = [];
    if (missing.includes('title')) messages.push('nome');
    if (missing.includes('dateRow')) messages.push('data e horário');
    if (missing.includes('location')) messages.push('local');
    if (missing.includes('tags')) messages.push('ao menos uma tag');
    AccessibilityInfo.announceForAccessibility(`Preencha: ${messages.join(', ')}.`);

    const node = fieldRefs[missing[0]].current;
    const scroll = scrollRef.current;
    const contentNode = containerRef.current;
    if (!node || !scroll || !contentNode) return;

    node.measureLayout(contentNode, (_x, y) => {
      scroll.scrollTo({ y: Math.max(y - SCROLL_MARGIN, 0), animated: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  if (isLoadingEvent || !form) return <EditEventSkeleton />;

  if (eventError) {
    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title={eventError.title}
          text={eventError.message}
          cta
          ctaLabel={eventError.canRetry ? 'Tentar de novo' : 'Voltar'}
          onCtaPress={eventError.canRetry ? reload : router.back}
        />
      </View>
    );
  }

  if (!event?.viewer.is_organizer) {
    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title="Edição indisponível"
          text="Só o organizador pode editar este evento."
          cta
          ctaLabel="Voltar"
          onCtaPress={router.back}
        />
      </View>
    );
  }

  if (event.status === 'FINISHED' || event.status === 'CANCELLED') {
    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title="Edição indisponível"
          text="Este evento não pode mais ser editado."
          cta
          ctaLabel="Voltar"
          onCtaPress={router.back}
        />
      </View>
    );
  }

  const set = <K extends keyof EditEventFormData>(key: K, value: EditEventFormData[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const toggleTag = (tagId: string) =>
    setForm((current) => {
      if (!current) return current;
      if (current.tagIds.includes(tagId)) {
        return { ...current, tagIds: current.tagIds.filter((id) => id !== tagId) };
      }
      if (current.tagIds.length >= MAX_TAGS) return current;
      return { ...current, tagIds: [...current.tagIds, tagId] };
    });

  const handlePickCover = async () => {
    const picked = await pickImage();
    if (picked) set('coverUri', picked.uri);
  };

  async function handleSave() {
    if (!form || !event) return;

    setLocalError(null);
    setSubmitCount((count) => count + 1);
    if (validate(form).length > 0) return;

    // O upload de capa ainda não existe (mesma limitação da criação): só dá
    // para mandar a capa que já veio do servidor, ou remover.
    const original = originalRef.current;
    if (form.coverUri && form.coverUri !== original?.coverUri) {
      setLocalError(
        'Remova a nova capa para salvar. O envio de imagens ainda não está disponível.',
      );
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
      return;
    }

    const eventDate = new Date(form.date!);
    eventDate.setHours(form.time!.getHours(), form.time!.getMinutes(), 0, 0);
    const endDate = new Date(eventDate.getTime() + durationMsRef.current);

    const saved = await saveEvent({
      title: form.title,
      description: form.description || null,
      cover_photo_url: form.coverUri,
      tag_ids: form.tagIds,
      event_date: eventDate.toISOString(),
      end_date: endDate.toISOString(),
      // Não há seleção de local de verdade ainda: as coordenadas seguem
      // fixas no ponto original do evento, só o texto é editável.
      location: event.location,
      location_name: form.location || null,
    });

    if (saved) {
      originalRef.current = form;
      router.back();
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          pointerEvents={isSaving ? 'none' : 'auto'}
        >
          <View ref={containerRef}>
            {(saveError || localError) && (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Icon name="triangle-alert" size={16} color={palette.error.default} />
                <Text style={[typography.bodyS, styles.errorBannerText]}>
                  {localError ?? saveError}
                </Text>
              </View>
            )}

            <View style={styles.field} ref={titleRef}>
              <TextField
                type="Text"
                label="Nome do evento"
                required
                value={form.title}
                onChangeText={(value) => set('title', value)}
                placeholder="Ex.: Clube do Livro"
                maxLength={50}
                error={showSummary && missing.includes('title') ? 'Dê um nome ao evento.' : undefined}
                reserveMessageSpace
                disabled={isSaving}
              />
            </View>

            <View style={styles.field}>
              <TextField
                type="TextArea"
                label="Descrição do evento"
                hint="Opcional"
                value={form.description}
                onChangeText={(value) => set('description', value)}
                placeholder="Conte o que vai rolar, quem pode ir e o que levar."
                maxLength={1000}
                disabled={isSaving}
              />
            </View>

            <View style={styles.field}>
              <FileUpload
                label="Capa"
                badge="Opcional"
                value={form.coverUri ? { uri: form.coverUri } : null}
                error={coverError ?? undefined}
                onPick={handlePickCover}
                onRemove={() => set('coverUri', null)}
              />
              {form.coverUri && form.coverUri !== originalRef.current?.coverUri && (
                <Text style={styles.notice}>
                  Capa selecionada apenas para prévia. Remova-a para salvar; o envio de imagens
                  ainda não está disponível.
                </Text>
              )}
            </View>

            <View style={styles.field} ref={dateRowRef}>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <FieldLabel label="Data do evento" required />
                  <TextField
                    type="Date"
                    dateMode="date"
                    dateValue={form.date ?? undefined}
                    onChangeDate={(value) => set('date', value)}
                    placeholder="DD/MM/AAAA"
                    accessibilityLabel="Data do evento, obrigatório"
                    disabled={isSaving}
                    style={styles.dateInput}
                  />
                </View>
                <View style={styles.timeField}>
                  <FieldLabel label="Horário" required />
                  <TextField
                    type="Date"
                    dateMode="time"
                    dateValue={form.time ?? undefined}
                    onChangeDate={(value) => set('time', value)}
                    placeholder="00:00"
                    accessibilityLabel="Horário do evento, obrigatório"
                    disabled={isSaving}
                    style={styles.dateInput}
                  />
                </View>
              </View>
              {showSummary && missing.includes('dateRow') && (
                <View style={styles.dateError} accessibilityRole="alert">
                  <Icon name="circle-alert" size={14} color={palette.error.default} />
                  <Text style={[typography.bodyS, styles.dateErrorText]}>
                    {!form.date || !form.time
                      ? 'Informe uma data e um horário válidos.'
                      : 'Essa data já passou. Escolha o dia de hoje ou uma data futura.'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.field} ref={locationRef}>
              <FieldLabel label="Local" required />
              <TextField
                type="Location"
                value={form.location}
                onChangeText={(value) => set('location', value)}
                placeholder="Digite o local do evento"
                maxLength={120}
                error={showSummary && missing.includes('location') ? 'Informe o local do evento' : undefined}
                reserveMessageSpace
                disabled={isSaving}
              />
            </View>

            <View style={styles.field} ref={tagsRef}>
              <TagPicker
                tags={tags}
                isLoading={tagsLoading}
                error={tagsError}
                selectedIds={form.tagIds}
                showError={showSummary && missing.includes('tags')}
                onToggle={toggleTag}
                onRetry={refetchTags}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
          <Button
            label="Salvar alterações"
            variant="Primary"
            size="LG"
            style={styles.saveButton}
            onPress={handleSave}
            isLoading={isSaving}
            disabled={!hasChanges}
          />
        </View>
      </KeyboardAvoidingView>

      <Dialog
        visible={showDiscardConfirm}
        variant="DiscardEvent"
        title="Descartar alterações?"
        description="As edições feitas não serão salvas."
        confirmLabel="Descartar"
        onConfirm={() => {
          setShowDiscardConfirm(false);
          router.back();
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </View>
  );
}

function EditEventSkeleton() {
  return (
    <View style={styles.screen} accessibilityLabel="Carregando evento" accessibilityRole="progressbar">
      <View style={styles.content}>
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} style={[styles.skeletonBlock, styles.skeletonRow]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
  },
  field: {
    marginBottom: spacing[24],
  },
  fieldLabel: {
    color: palette.neutral[700],
    marginBottom: spacing[4],
  },
  required: {
    color: palette.error.default,
  },
  notice: {
    ...typography.bodyS,
    color: colors.text.secondary,
    marginTop: spacing[8],
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  dateField: {
    flex: 3,
    minWidth: 0,
  },
  timeField: {
    flex: 2,
    minWidth: 0,
  },
  dateInput: {
    minWidth: 0,
  },
  dateError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  dateErrorText: {
    color: palette.error.default,
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: palette.error.bg,
    borderRadius: radius.sm,
    padding: spacing[12],
    marginBottom: spacing[16],
  },
  errorBannerText: {
    flex: 1,
    color: palette.error.default,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
    padding: spacing[16],
  },
  saveButton: {
    alignSelf: 'stretch',
  },
  skeletonBlock: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  skeletonRow: {
    height: 56,
    marginBottom: spacing[16],
  },
});
