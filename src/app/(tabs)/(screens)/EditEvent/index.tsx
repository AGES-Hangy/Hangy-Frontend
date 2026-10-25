import type { ScrollViewInstance, ViewInstance } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
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
import { INVALID_COVER_MESSAGE, useEventCoverUpload } from '@/hooks/useEventCoverUpload';
import { useTags } from '@/hooks/useTags';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { announce, moveAccessibilityFocus, restoreLostFocus } from '@/utils/accessibility';

import { TagPicker } from '@/components/CreateEvent/TagPicker';
import { MAX_TAGS } from '@/components/CreateEvent/types';
import type { EventDetail } from '@/types/event';

type EditEventFormData = {
  title: string;
  description: string;
  /** Prévia da capa: a URL salva ou a URI local de uma capa nova. */
  coverUri: string | null;
  /** O que vai em `cover_photo_url`: a URL salva ou a devolvida pelo envio. */
  coverUrl: string | null;
  date: Date | null;
  time: Date | null;
  location: string;
  /** `null` enquanto o texto digitado não virou um local da lista ou do mapa. */
  locationCoordinates: { latitude: number; longitude: number } | null;
  /** Bairro e cidade do local selecionado — derivados dele, nunca digitados. */
  locationNeighborhood: string | null;
  locationCity: string | null;
  tagIds: string[];
};

type MissingField = 'title' | 'dateRow' | 'location' | 'tags';

const SCROLL_MARGIN = spacing[16];

function toFormData(event: EventDetail): EditEventFormData {
  const eventDate = new Date(event.event_date);
  return {
    title: event.title,
    description: event.description ?? '',
    coverUri: event.cover_photo_url,
    coverUrl: event.cover_photo_url,
    date: eventDate,
    time: eventDate,
    location: event.location_name ?? '',
    locationCoordinates: event.location,
    // O detalhe não devolve bairro e cidade separados; só são preenchidos (e
    // enviados) quando o organizador escolhe um endereço novo.
    locationNeighborhood: null,
    locationCity: null,
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
  if (form.location.trim().length === 0 || form.locationCoordinates === null) missing.push('location');
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
  const scrollRef = useRef<ScrollViewInstance>(null);
  const containerRef = useRef<ViewInstance>(null);
  const titleRef = useRef<ViewInstance>(null);
  const dateRowRef = useRef<ViewInstance>(null);
  const locationRef = useRef<ViewInstance>(null);
  const tagsRef = useRef<ViewInstance>(null);
  const coverRef = useRef<ViewInstance>(null);

  const { event, isLoading: isLoadingEvent, error: eventError, reload } = useEvent(id);
  const { saveEvent, isSaving, saveError } = useEditEvent(id);
  const { tags, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } = useTags();
  const {
    pickAndUpload: pickAndUploadCover,
    cancelUpload: cancelCoverUpload,
    clearImage: clearCoverImage,
    reset: resetCoverUpload,
    isUploading: isCoverUploading,
    progress: coverProgress,
    error: coverUploadError,
  } = useEventCoverUpload();

  const [form, setForm] = useState<EditEventFormData | null>(null);
  const originalRef = useRef<EditEventFormData | null>(null);
  const durationMsRef = useRef(2 * 60 * 60 * 1000);
  const [submitCount, setSubmitCount] = useState(0);
  /** Capa recusada pela API ao salvar; aparece como erro do FileUpload. */
  const [coverRejected, setCoverRejected] = useState<string | null>(null);
  const [coverFocusRequest, setCoverFocusRequest] = useState(0);
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

  // A tela continua montada ao sair: o envio em andamento é cancelado aqui, e
  // o formulário fica como estava.
  useFocusEffect(useCallback(() => () => cancelCoverUpload(), [cancelCoverUpload]));

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

  const fieldRefs: Record<MissingField, React.RefObject<ViewInstance | null>> = {
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

  // Num efeito, e não no `onLayout` como no Criar evento: aqui o FileUpload já
  // está montado quando o 400 chega, e nada acima dele muda de altura.
  useEffect(() => {
    if (coverFocusRequest === 0) return;

    const node = coverRef.current;
    const scroll = scrollRef.current;
    const contentNode = containerRef.current;
    if (!node || !scroll || !contentNode) return;

    node.measureLayout(contentNode, (_x, y) => {
      scroll.scrollTo({ y: Math.max(y - SCROLL_MARGIN, 0), animated: true });
    });
    moveAccessibilityFocus(node);
  }, [coverFocusRequest]);

  // `null` até o formulário carregar: a primeira capa não conta como troca.
  const coverState = !form
    ? null
    : (coverUploadError ?? coverRejected)
      ? 'error'
      : isCoverUploading ? 'uploading' : form.coverUri ? 'filled' : 'empty';
  const previousCoverStateRef = useRef(coverState);

  // No web, o botão acionado (adicionar, cancelar, remover) some quando o
  // FileUpload troca de estado, e o foco do teclado cai no `body`.
  useEffect(() => {
    const previous = previousCoverStateRef.current;
    previousCoverStateRef.current = coverState;
    if (previous === null || previous === coverState) return;
    const node = coverRef.current;
    if (node) restoreLostFocus(node);
  }, [coverState]);

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

  // Digitar invalida o que veio da seleção anterior — coordenadas, bairro e
  // cidade saem sempre do mesmo ponto. Voltar ao texto original restaura o
  // local original, para desfazer a digitação não exigir escolher de novo.
  const handleChangeLocation = (value: string) =>
    setForm((current) => {
      if (!current) return current;
      const original = originalRef.current;
      if (original && value === original.location) {
        return {
          ...current,
          location: value,
          locationCoordinates: original.locationCoordinates,
          locationNeighborhood: original.locationNeighborhood,
          locationCity: original.locationCity,
        };
      }
      return {
        ...current,
        location: value,
        locationCoordinates: null,
        locationNeighborhood: null,
        locationCity: null,
      };
    });

  const pickCover = async () => {
    setCoverRejected(null);
    const uploaded = await pickAndUploadCover();
    if (uploaded) {
      setForm((current) =>
        current ? { ...current, coverUri: uploaded.uri, coverUrl: uploaded.url } : current,
      );
    }
  };

  const removeCover = () => {
    clearCoverImage();
    setForm((current) => (current ? { ...current, coverUri: null, coverUrl: null } : current));
  };

  async function handleSave() {
    if (!form || !event || isCoverUploading) return;

    setSubmitCount((count) => count + 1);
    if (validate(form).length > 0) return;

    const original = originalRef.current;
    const eventDate = new Date(form.date!);
    eventDate.setHours(form.time!.getHours(), form.time!.getMinutes(), 0, 0);
    const endDate = new Date(eventDate.getTime() + durationMsRef.current);

    // Bairro e cidade entram na comparação: escolher de novo o mesmo endereço
    // num evento antigo (sem esses dois) mantém texto e coordenadas, mas
    // precisa enviar o local para o backend gravá-los.
    const locationChanged =
      form.location !== original?.location ||
      form.locationCoordinates?.latitude !== original?.locationCoordinates?.latitude ||
      form.locationCoordinates?.longitude !== original?.locationCoordinates?.longitude ||
      form.locationNeighborhood !== original?.locationNeighborhood ||
      form.locationCity !== original?.locationCity;
    const coverChanged = form.coverUrl !== original?.coverUrl;

    const result = await saveEvent({
      title: form.title,
      description: form.description || null,
      // Capa sem troca nem remoção fica fora do corpo: o backend mantém a
      // salva sem depender de compará-la com o valor recebido.
      ...(coverChanged ? { cover_photo_url: form.coverUrl } : {}),
      tag_ids: form.tagIds,
      event_date: eventDate.toISOString(),
      end_date: endDate.toISOString(),
      // Sem mexer no endereço, nenhum campo de local vai no corpo: o backend
      // recalcula o ponto aproximado sempre que `location` chega.
      ...(locationChanged && form.locationCoordinates
        ? {
            location: form.locationCoordinates,
            location_name: form.location || null,
            location_neighborhood: form.locationNeighborhood,
            location_city: form.locationCity,
          }
        : {}),
    });

    if (result === 'invalid-cover') {
      removeCover();
      setCoverRejected(INVALID_COVER_MESSAGE);
      setCoverFocusRequest((count) => count + 1);
      // Sempre, e não só o foco: se o foco não mudar de lugar, este anúncio é
      // o único jeito de o leitor de tela saber da recusa.
      announce(INVALID_COVER_MESSAGE);
      return;
    }

    if (result === 'saved') {
      // A prévia passa para a URL do servidor, como na primeira carga: a tela
      // não desmonta, e o `blob:` liberado aqui não pode voltar num descarte.
      const savedForm = { ...form, coverUri: form.coverUrl };
      originalRef.current = savedForm;
      setForm(savedForm);
      resetCoverUpload();
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
            {saveError && (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Icon name="triangle-alert" size={16} color={palette.error.default} />
                <Text style={[typography.bodyS, styles.errorBannerText]}>
                  {saveError}
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

            <View style={styles.field} ref={coverRef}>
              <FileUpload
                label="Capa"
                badge="Opcional"
                value={form.coverUri ? { uri: form.coverUri } : null}
                progress={isCoverUploading ? (coverProgress ?? 0) : undefined}
                error={coverUploadError ?? coverRejected ?? undefined}
                onPick={pickCover}
                onCancel={cancelCoverUpload}
                onRemove={removeCover}
              />
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

            <View style={[styles.field, styles.locationField]} ref={locationRef}>
              <FieldLabel label="Local" required />
              <AddressAutocompleteField
                value={form.location}
                onChangeText={handleChangeLocation}
                onSelect={(suggestion) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          location: suggestion.shortLabel,
                          locationCoordinates: {
                            latitude: suggestion.latitude,
                            longitude: suggestion.longitude,
                          },
                          locationNeighborhood: suggestion.neighborhood,
                          locationCity: suggestion.city,
                        }
                      : current,
                  )
                }
                placeholder="Digite o local do evento"
                maxLength={120}
                error={
                  showSummary && missing.includes('location')
                    ? 'Selecione um local da lista ou do mapa'
                    : undefined
                }
                reserveMessageSpace
                accessibilityLabel="Local do evento, obrigatório"
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
            disabled={!hasChanges || isCoverUploading}
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
          // A tela não desmonta ao sair: sem restaurar o formulário, reabrir
          // mostraria as edições descartadas e uma prévia `blob:` já revogada.
          resetCoverUpload();
          setForm(originalRef.current);
          setCoverRejected(null);
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
  // A lista de sugestões do campo é absoluta; sem elevar o wrapper, o bloco
  // de tags pinta por cima dela e não deixa tocar nas sugestões.
  locationField: {
    zIndex: 1,
    elevation: 1,
  },
  fieldLabel: {
    color: palette.neutral[700],
    marginBottom: spacing[4],
  },
  required: {
    color: palette.error.default,
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
