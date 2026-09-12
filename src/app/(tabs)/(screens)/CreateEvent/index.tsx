import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
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
  participantLimit: 10,
  unlimited: false,
  privacy: 'PUBLIC',
  inviteeIds: [],
};

export default function CreateEvent() {
  useTopAppBar({ variant: 'Modal', title: 'Criar evento' });

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const step2Ref = useRef<Step2Handle>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateEventFormData>(EMPTY_FORM);
  const [submitCount, setSubmitCount] = useState(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

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
    setSubmitCount((c) => c + 1);
    if (isUploadingCover) return;
    if (missing.length === 0) {
      setStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handlePublish = () => {
    const valid = step2Ref.current?.submit();
    if (!valid) return;

    const eventDate = new Date(form.date!);
    if (form.time) {
      eventDate.setHours(form.time.getHours(), form.time.getMinutes(), 0, 0);
    }
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

    void publishEvent({
      title: form.title,
      description: form.description || null,
      cover_photo_url: form.coverUri,
      tag_ids: form.tagIds,
      event_date: eventDate.toISOString(),
      end_date: endDate.toISOString(),
      // TODO: substituir por geocoding real do campo location (task futura)
      location: { latitude: 0, longitude: 0 },
      location_name: form.location || null,
      max_participants: form.unlimited ? null : form.participantLimit,
      privacy: form.privacy,
    });
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
              onUploadingChange={setIsUploadingCover}
            />
          ) : (
            <Step2
              ref={step2Ref}
              data={form}
              onChangeDate={(v) => setForm((f) => ({ ...f, date: v }))}
              onChangeTime={(v) => setForm((f) => ({ ...f, time: v }))}
              onChangeLocation={(v) => setForm((f) => ({ ...f, location: v }))}
              onChangeParticipantLimit={(v) => setForm((f) => ({ ...f, participantLimit: v }))}
              onChangeUnlimited={(v) => setForm((f) => ({ ...f, unlimited: v }))}
              onChangePrivacy={(v: Privacy) => setForm((f) => ({ ...f, privacy: v }))}
              isPublishing={isPublishing}
              publishError={publishError}
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
              onPress={() => setStep(1)}
              disabled={isPublishing}
              accessibilityLabel="Voltar para a etapa anterior"
            />
          )}
          <Button
            label={step === 1 ? 'Continuar' : isPublishing ? 'Publicando...' : 'Publicar'}
            variant="Primary"
            size="LG"
            style={styles.primaryButton}
            onPress={step === 1 ? handleContinue : handlePublish}
            disabled={isPublishing}
          />
        </View>
      </KeyboardAvoidingView>
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
});
