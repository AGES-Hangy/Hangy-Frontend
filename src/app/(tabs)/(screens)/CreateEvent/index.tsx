import { useRef, useState } from 'react';
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

import { Step1, type Step1Handle } from '@/components/CreateEvent/Step1';
import { Step2 } from '@/components/CreateEvent/Step2';
import { Stepper } from '@/components/CreateEvent/Stepper';
import { MAX_TAGS, type CreateEventFormData } from '@/components/CreateEvent/types';

const EMPTY_FORM: CreateEventFormData = {
  title: '',
  description: '',
  coverUri: null,
  tagIds: [],
};

/**
 * Container do wizard de criação de evento. É dono de tudo que atravessa
 * etapas: o formulário inteiro, o passo atual, o `Stepper`, o `ScrollView` da
 * página e o rodapé fixo com o botão.
 */
export default function CreateEvent() {
  // "Criar evento" fecha o fluxo, não volta um passo — por isso Modal (o `x`
  // no lugar da seta), como o frame do Figma desenha.
  useTopAppBar({ variant: 'Modal', title: 'Criar evento' });

  // O `x` da barra sai direto via `router.back()` (comportamento padrão do
  // TopAppBar variante Modal) — nada a implementar aqui. A confirmação de
  // descarte depende de uma variante `DiscardEvent` que o `Dialog` ainda não
  // tem.
  //
  // Divergência Figma x Design System: o TopAppBar variante Modal alinha o
  // título à esquerda; o Figma pede centralizado. O componente não pode ser
  // alterado, então fica a divergência.

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const step1Ref = useRef<Step1Handle>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CreateEventFormData>(EMPTY_FORM);
  const [footerHeight, setFooterHeight] = useState(0);

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
    if (step === 1) {
      if (step1Ref.current?.submit()) setStep(2);
      return;
    }
    // Etapa 2: POST /events e a publicação são da task 094.
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
          contentContainerStyle={[
            styles.content,
            { paddingBottom: footerHeight + spacing[24] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <Step1
              ref={step1Ref}
              data={form}
              scrollRef={scrollRef}
              onChangeTitle={setTitle}
              onChangeDescription={setDescription}
              onChangeCover={setCoverUri}
              onToggleTag={toggleTag}
            />
          ) : (
            <Step2 />
          )}
        </ScrollView>

        <View
          style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
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
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
    padding: spacing[16],
  },
  button: {
    alignSelf: 'stretch',
  },
});
