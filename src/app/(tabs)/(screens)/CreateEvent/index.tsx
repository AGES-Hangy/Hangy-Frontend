import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useCreateEventStep2 } from '@/hooks/useCreateEventStep2';
import { INVALID_COVER_MESSAGE, useEventCoverUpload } from '@/hooks/useEventCoverUpload';
import { announce } from '@/utils/accessibility';

import { Step1 } from '@/components/CreateEvent/Step1';
import { Step2, type Step2Handle } from '@/components/CreateEvent/Step2';
import { Stepper } from '@/components/CreateEvent/Stepper';
import { MAX_TAGS, type CreateEventFormData, type Privacy } from '@/components/CreateEvent/types';
import { validateStep1 } from '@/components/CreateEvent/validation';

const EMPTY_FORM: CreateEventFormData = {
  title: '',
  description: '',
  coverUri: null,
  coverUrl: null,
  tagIds: [],
  date: null,
  time: null,
  location: '',
  locationCoordinates: null,
  locationNeighborhood: null,
  locationCity: null,
  participantLimit: 10,
  unlimited: false,
  privacy: 'PUBLIC',
};

export default function CreateEvent() {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const step2Ref = useRef<Step2Handle>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateEventFormData>(EMPTY_FORM);
  const [submitCount, setSubmitCount] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  /** Capa recusada pela API ao publicar; aparece como erro do FileUpload. */
  const [coverRejected, setCoverRejected] = useState<string | null>(null);
  const [focusCover, setFocusCover] = useState(false);

  const {
    pickAndUpload: pickAndUploadCover,
    cancelUpload: cancelCoverUpload,
    clearImage: clearCoverImage,
    reset: resetCoverUpload,
    isUploading: isCoverUploading,
    progress: coverProgress,
    error: coverUploadError,
  } = useEventCoverUpload();

  // A tela é uma aba de `Tabs` (ver (tabs)/_layout.tsx) e continua montada ao
  // trocar de aba — sem isto, sair e reabrir manteria o formulário preenchido
  // ou, pior, cairia direto no passo 2 de uma criação anterior.
  const resetForm = useCallback(() => {
    resetCoverUpload();
    setForm(EMPTY_FORM);
    setStep(1);
    setSubmitCount(0);
    setLocalError(null);
    setCoverRejected(null);
    setFocusCover(false);
  }, [resetCoverUpload]);

  // Pelo mesmo motivo, sair da tela não desmonta o hook: o envio em andamento
  // é cancelado aqui, e o formulário fica como estava.
  useFocusEffect(useCallback(() => () => cancelCoverUpload(), [cancelCoverUpload]));

  const handleDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    resetForm();
    router.back();
  }, [resetForm]);

  useTopAppBar({
    variant: 'Modal',
    title: 'Criar evento',
    onBack: () => setShowDiscardConfirm(true),
  });

  const missing = useMemo(() => validateStep1(form), [form.title, form.tagIds]);

  const {
    publishEvent,
    generateInviteLink,
    isPublishing: isPublishingEvent,
    isGeneratingLink,
    publishError,
  } = useCreateEventStep2();
  // Publicar e gerar o link de convite são uma operação só para o usuário.
  const isPublishing = isPublishingEvent || isGeneratingLink;

  const setTitle = (title: string) => setForm((f) => ({ ...f, title }));
  const setDescription = (description: string) => setForm((f) => ({ ...f, description }));
  const pickCover = async () => {
    setCoverRejected(null);
    const uploaded = await pickAndUploadCover();
    if (uploaded) setForm((f) => ({ ...f, coverUri: uploaded.uri, coverUrl: uploaded.url }));
  };
  const removeCover = () => {
    clearCoverImage();
    setForm((f) => ({ ...f, coverUri: null, coverUrl: null }));
  };
  const toggleTag = (id: string) =>
    setForm((f) => {
      if (f.tagIds.includes(id)) return { ...f, tagIds: f.tagIds.filter((t) => t !== id) };
      if (f.tagIds.length >= MAX_TAGS) return f;
      return { ...f, tagIds: [...f.tagIds, id] };
    });

  const handleContinue = () => {
    if (isCoverUploading) return;
    setLocalError(null);
    setSubmitCount((c) => c + 1);
    if (missing.length === 0) {
      setStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handlePublish = async () => {
    if (isCoverUploading) return;
    setLocalError(null);
    const valid = step2Ref.current?.submit();
    if (!valid) return;

    const showLocalError = (message: string) => {
      setLocalError(message);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
      AccessibilityInfo.announceForAccessibility(message);
    };

    if (!form.locationCoordinates) {
      showLocalError('Selecione um local da lista ou do mapa antes de publicar.');
      return;
    }

    const eventDate = new Date(form.date!);
    if (form.time) {
      eventDate.setHours(form.time.getHours(), form.time.getMinutes(), 0, 0);
    }
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    const result = await publishEvent({
      title: form.title,
      description: form.description || null,
      cover_photo_url: form.coverUrl,
      tag_ids: form.tagIds,
      event_date: eventDate.toISOString(),
      end_date: endDate.toISOString(),
      location: form.locationCoordinates,
      location_name: form.location || null,
      location_neighborhood: form.locationNeighborhood,
      location_city: form.locationCity,
      max_participants: form.unlimited ? null : form.participantLimit,
      privacy: form.privacy,
    });
    if (result.kind === 'invalid-cover') {
      removeCover();
      setCoverRejected(INVALID_COVER_MESSAGE);
      setStep(1);
      setFocusCover(true);
      // Sempre, e não só o foco: se o foco não mudar de lugar, este anúncio é
      // o único jeito de o leitor de tela saber da recusa.
      announce(INVALID_COVER_MESSAGE);
      return;
    }
    if (result.kind === 'failed') return;
    const { event_id: eventId } = result.event;

    // O backend não cria o link junto com o evento, e `GET /events/{id}/share`
    // responde 404 para um evento por convite que ainda não tem um — é o link
    // gerado aqui que a tela de publicado lê para compartilhar.
    if (form.privacy === 'INVITE_ONLY') await generateInviteLink(eventId);

    // `replace` troca a entrada de criação no histórico: fechar a tela de
    // publicado não devolve o usuário ao formulário.
    router.replace({
      pathname: '/EventPublished',
      params: { eventId, privacy: form.privacy },
    });
    resetForm();
  };

  return (
    <View style={styles.screen}>
      <Stepper current={step} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          pointerEvents={isPublishing ? 'none' : 'auto'}
        >
          {step === 1 ? (
            <Step1
              data={form}
              scrollRef={scrollRef}
              missing={missing}
              submitCount={submitCount}
              coverProgress={isCoverUploading ? (coverProgress ?? 0) : undefined}
              coverError={coverUploadError ?? coverRejected}
              focusCover={focusCover}
              onChangeTitle={setTitle}
              onChangeDescription={setDescription}
              onPickCover={pickCover}
              onCancelCover={cancelCoverUpload}
              onRemoveCover={removeCover}
              onCoverFocused={() => setFocusCover(false)}
              onToggleTag={toggleTag}
            />
          ) : (
            <Step2
              ref={step2Ref}
              data={form}
              scrollRef={scrollRef}
              onChangeDate={(v) => setForm((f) => ({ ...f, date: v }))}
              onChangeTime={(v) => setForm((f) => ({ ...f, time: v }))}
              // Digitar invalida tudo que veio da seleção anterior: bairro e
              // cidade saem sempre do mesmo ponto que as coordenadas.
              onChangeLocation={(v) => setForm((f) => ({
                ...f,
                location: v,
                locationCoordinates: null,
                locationNeighborhood: null,
                locationCity: null,
              }))}
              onSelectLocation={(suggestion) => setForm((f) => ({
                ...f,
                location: suggestion.shortLabel,
                locationCoordinates: { latitude: suggestion.latitude, longitude: suggestion.longitude },
                locationNeighborhood: suggestion.neighborhood,
                locationCity: suggestion.city,
              }))}
              onChangeParticipantLimit={(v) => setForm((f) => ({ ...f, participantLimit: v }))}
              onChangeUnlimited={(v) => setForm((f) => ({ ...f, unlimited: v }))}
              onChangePrivacy={(v: Privacy) => setForm((f) => ({ ...f, privacy: v }))}
              isPublishing={isPublishing}
              publishError={localError ?? publishError}
            />
          )}
        </ScrollView>

        {isPublishing && <View style={styles.overlay} pointerEvents="none" />}

        <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
          {step === 2 && (
            <Button
              label="Voltar"
              variant="Secondary"
              size="LG"
              style={styles.backButton}
              onPress={() => {
                setLocalError(null);
                setStep(1);
              }}
              disabled={isPublishing}
              accessibilityLabel="Voltar para a etapa anterior"
            />
          )}
          <Button
            label={step === 1 ? 'Continuar' : 'Publicar'}
            variant="Primary"
            size="LG"
            style={styles.primaryButton}
            onPress={step === 1 ? handleContinue : handlePublish}
            disabled={isCoverUploading}
            isLoading={step === 2 && isPublishing}
          />
        </View>
      </KeyboardAvoidingView>

      <Dialog
        visible={showDiscardConfirm}
        variant="DiscardEvent"
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.base,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
    padding: spacing[16],
  },
  backButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
});
