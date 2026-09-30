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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useCreateEventStep2 } from '@/hooks/useCreateEventStep2';

import { Step1 } from '@/components/CreateEvent/Step1';
import { Step2, type Step2Handle } from '@/components/CreateEvent/Step2';
import { Stepper } from '@/components/CreateEvent/Stepper';
import { MAX_TAGS, type CreateEventFormData, type Privacy } from '@/components/CreateEvent/types';
import { validateStep1 } from '@/components/CreateEvent/validation';

const EMPTY_FORM: CreateEventFormData = {
  title: '',
  description: '',
  coverUri: null,
  tagIds: [],
  date: null,
  time: null,
  location: '',
  locationCoordinates: null,
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

  // A tela é uma aba de `Tabs` (ver (tabs)/_layout.tsx) e continua montada ao
  // trocar de aba — sem isto, sair e reabrir manteria o formulário preenchido
  // ou, pior, cairia direto no passo 2 de uma criação anterior.
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setStep(1);
    setSubmitCount(0);
    setLocalError(null);
  }, []);

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
  const setCoverUri = (coverUri: string | null) => setForm((f) => ({ ...f, coverUri }));
  const toggleTag = (id: string) =>
    setForm((f) => {
      if (f.tagIds.includes(id)) return { ...f, tagIds: f.tagIds.filter((t) => t !== id) };
      if (f.tagIds.length >= MAX_TAGS) return f;
      return { ...f, tagIds: [...f.tagIds, id] };
    });

  const handleContinue = () => {
    setLocalError(null);
    setSubmitCount((c) => c + 1);
    if (missing.length === 0) {
      setStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handlePublish = async () => {
    setLocalError(null);
    const valid = step2Ref.current?.submit();
    if (!valid) return;

    const showLocalError = (message: string) => {
      setLocalError(message);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
      AccessibilityInfo.announceForAccessibility(message);
    };

    if (form.coverUri) {
      showLocalError('Remova a capa para publicar sem imagem. O envio de capas ainda não está disponível.');
      return;
    }

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
      cover_photo_url: null,
      tag_ids: form.tagIds,
      event_date: eventDate.toISOString(),
      end_date: endDate.toISOString(),
      location: form.locationCoordinates,
      location_name: form.location || null,
      max_participants: form.unlimited ? null : form.participantLimit,
      privacy: form.privacy,
    });
    if (!result) return;

    // O backend não cria o link junto com o evento, e `GET /events/{id}/share`
    // responde 404 para um evento por convite que ainda não tem um — é o link
    // gerado aqui que a tela de publicado lê para compartilhar.
    if (form.privacy === 'INVITE_ONLY') await generateInviteLink(result.event_id);

    // `replace` troca a entrada de criação no histórico: fechar a tela de
    // publicado não devolve o usuário ao formulário.
    router.replace({
      pathname: '/EventPublished',
      params: { eventId: result.event_id, privacy: form.privacy },
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
              onChangeTitle={setTitle}
              onChangeDescription={setDescription}
              onChangeCover={setCoverUri}
              onToggleTag={toggleTag}
            />
          ) : (
            <Step2
              ref={step2Ref}
              data={form}
              scrollRef={scrollRef}
              onChangeDate={(v) => setForm((f) => ({ ...f, date: v }))}
              onChangeTime={(v) => setForm((f) => ({ ...f, time: v }))}
              onChangeLocation={(v) => setForm((f) => ({ ...f, location: v, locationCoordinates: null }))}
              onSelectLocation={(suggestion) => setForm((f) => ({
                ...f,
                location: suggestion.shortLabel,
                locationCoordinates: { latitude: suggestion.latitude, longitude: suggestion.longitude },
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
