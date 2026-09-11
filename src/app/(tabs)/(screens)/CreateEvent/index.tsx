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

import { Step1 } from '@/components/CreateEvent/Step1';
import { Step2 } from '@/components/CreateEvent/Step2';
import { Stepper } from '@/components/CreateEvent/Stepper';
import { MAX_TAGS, type CreateEventFormData } from '@/components/CreateEvent/types';
import { validateStep1 } from '@/components/CreateEvent/validation';

const EMPTY_FORM: CreateEventFormData = {
  title: '',
  description: '',
  coverUri: null,
  tagIds: [],
};

export default function CreateEvent() {
 
  useTopAppBar({ variant: 'Modal', title: 'Criar evento' });

  // O `x` da barra sai direto via `router.back()` (comportamento padrão do
  // TopAppBar variante Modal). A confirmação de
  // descarte depende de uma variante `DiscardEvent` que o `Dialog` ainda não
  // tem.
  //
  // Divergência Figma x Design System: o TopAppBar variante Modal alinha o
  // título à esquerda; o Figma pede centralizado. O componente não pode ser
  // alterado, então fica a diferente.

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateEventFormData>(EMPTY_FORM);
  const [submitCount, setSubmitCount] = useState(0);
  // O hook de upload vive no Step1; aqui só interessa se ainda está em curso,
  // para o "Continuar" não avançar e cancelar o envio da capa no meio.
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const missing = useMemo(() => validateStep1(form), [form.title, form.tagIds]);

  const setTitle = (title: string) => setForm((current) => ({ ...current, title }));
  const setDescription = (description: string) =>
    setForm((current) => ({ ...current, description }));
  const setCoverUri = (coverUri: string | null) =>
    setForm((current) => ({ ...current, coverUri }));

  const toggleTag = (id: string) =>
    setForm((current) => {
      if (current.tagIds.includes(id)) {
        return { ...current, tagIds: current.tagIds.filter((tagId) => tagId !== id) };
      }
      if (current.tagIds.length >= MAX_TAGS) return current;
      return { ...current, tagIds: [...current.tagIds, id] };
    });

  const handleContinue = () => {
    if (step !== 1) return;

    // Contador, não booleano: cada toque precisa valer como uma tentativa nova
    // para o Step1 rolar de novo até o campo pendente, mesmo sem nada ter
    // mudado no formulário desde o toque anterior.
    setSubmitCount((count) => count + 1);

    if (isUploadingCover) return;
    if (missing.length === 0) setStep(2);
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
            <Step2 />
          )}
        </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
          <Button
            label="Continuar"
            variant="Primary"
            size="LG"
            style={styles.button}
            onPress={handleContinue}
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
    padding: spacing[16],
  },
  button: {
    alignSelf: 'stretch',
  },
});
