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
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
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
  inviteeIds: [],
};

export default function CreateEvent() {
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null);
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
  // ou, pior, cairia direto na tela de "evento publicado" de uma criação
  // anterior.
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setStep(1);
    setSubmitCount(0);
    setLocalError(null);
    setPublishedTitle(null);
  }, []);

  const handleDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    resetForm();
    router.back();
  }, [resetForm]);

  const handleLeavePublished = useCallback(() => {
    resetForm();
    router.back();
  }, [resetForm]);

  useTopAppBar({
    variant: 'Modal',
    title: publishedTitle ? 'Evento publicado' : 'Criar evento',
    onBack: publishedTitle ? handleLeavePublished : () => setShowDiscardConfirm(true),
  });

  const missing = useMemo(() => validateStep1(form), [form.title, form.tagIds]);

  const { publishEvent, isPublishing, publishError } = useCreateEventStep2();

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
      showLocalError('Não é possível publicar sem confirmar o local. A seleção de locais ainda não está disponível.');
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
    if (result) setPublishedTitle(result.title);
  };

  if (publishedTitle) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Icon name="circle-check" size={32} color={palette.success.default} />
          </View>
          <Text style={[typography.h2, styles.successTitle]}>Seu evento está no ar</Text>
          <Text style={[typography.bodyM, styles.successDescription]}>
            O evento “{publishedTitle}” foi publicado com sucesso.
          </Text>
        </View>
        <View style={[styles.successFooter, { paddingBottom: spacing[16] + insets.bottom }]}>
          <Button
            label="Ir para o início"
            onPress={() => {
              resetForm();
              router.replace('/Home');
            }}
          />
        </View>
      </View>
    );
  }

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
              onChangeLocation={(v) => setForm((f) => ({ ...f, location: v, locationCoordinates: { latitude: 0, longitude: 0 } }))}
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
    ...StyleSheet.absoluteFillObject,
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
  successScreen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  successIcon: {
    backgroundColor: palette.success.bg,
    borderRadius: 32,
    padding: spacing[16],
    marginBottom: spacing[24],
  },
  successTitle: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  successDescription: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  successFooter: {
    padding: spacing[16],
  },
});
