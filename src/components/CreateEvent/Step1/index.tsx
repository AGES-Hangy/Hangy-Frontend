import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  type ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { FileUpload } from '@/components/FileUpload';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/layout';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTags } from '@/hooks/useTags';

import { describeMissing, ErrorSummary } from '@/components/CreateEvent/ErrorSummary';
import { TagPicker } from '@/components/CreateEvent/TagPicker';
import type { CreateEventFormData, MissingField } from '@/components/CreateEvent/types';
const FIELD_ORDER: MissingField[] = ['title', 'tags'];

const SCROLL_MARGIN = spacing[16];

type Step1Props = {
  data: CreateEventFormData;
  scrollRef: React.RefObject<ScrollView | null>;
  /** Pendências da etapa, calculadas pelo container. */
  missing: MissingField[];
  /** Quantos toques em "Continuar". Cada incremento é uma tentativa nova. */
  submitCount: number;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeCover: (uri: string | null) => void;
  onToggleTag: (id: string) => void;
  /** O container precisa saber para não avançar com a capa ainda subindo. */
  onUploadingChange: (isUploading: boolean) => void;
};

export function Step1({
  data,
  scrollRef,
  missing,
  submitCount,
  onChangeTitle,
  onChangeDescription,
  onChangeCover,
  onToggleTag,
  onUploadingChange,
}: Step1Props) {
  const { tags, isLoading: tagsLoading, error: tagsError, refetch } = useTags();
  const {   pickImage, upload, cancel, isLoading: isUploadingCover, progress, error: coverError,
} = useImageUpload();

  // Se a pessoa avança para a etapa 2 com um upload em curso, este componente
  // desmonta e o upload seguiria rodando sem ninguém para receber o resultado.
  // O efeito sem array de dependências mantém o ref apontando para o `cancel`
  // do render atual, em vez de mutá-lo durante o render.
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => () => cancelRef.current?.(), []);

  useEffect(() => {
    onUploadingChange(isUploadingCover);
  }, [isUploadingCover]);

  const fieldPositions = useRef<Record<MissingField, number>>({ title: 0, tags: 0 });

  const submitAttempted = submitCount > 0;
  const isTitleMissing = missing.includes('title');
  const areTagsMissing = missing.includes('tags');

  // Validação do nome no blur (erro ao sair do campo vazio) depende de o
  // TextField repassar `onBlur` hoje ele não expõe essa prop e o componente
  // não pode ser editado. Por isso o erro do nome só aparece depois de tentar
  // avançar.
  const showTitleError = submitAttempted && isTitleMissing;
  const showSummary = submitAttempted && missing.length > 0;

  const rememberPosition = (field: MissingField) => (event: LayoutChangeEvent) => {
    fieldPositions.current[field] = event.nativeEvent.layout.y;
  };
  // Só `submitCount` nas dependências: o efeito reage ao toque em "Continuar",
  // não às mudanças do formulário, e lê o `missing` do render em que o contador
  // subiu.
  useEffect(() => {
    if (submitCount === 0) return;

    if (isUploadingCover) {
      AccessibilityInfo.announceForAccessibility('Aguarde o envio da capa terminar.');
      return;
    }

    if (missing.length === 0) return;

    const firstMissing = FIELD_ORDER.find((field) => missing.includes(field)) ?? missing[0];
    requestAnimationFrame(() => {
      const targetY = Math.max(fieldPositions.current[firstMissing] - SCROLL_MARGIN, 0);
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
      AccessibilityInfo.announceForAccessibility(describeMissing(missing));
    });
  }, [submitCount]);

  const handlePickCover = async () => {
    const picked = await pickImage();
    if (!picked) return;

    const result = await upload(picked);
    if (result) onChangeCover(result.url);
  };

  return (
    <View>
      {showSummary ? <ErrorSummary missing={missing} /> : null}

      <View style={styles.field} onLayout={rememberPosition('title')}>
        <TextField
          type="Text"
          label="Nome do evento"
          required
          value={data.title}
          onChangeText={onChangeTitle}
          placeholder="Ex.: Clube do Livro"
          maxLength={50}
          error={showTitleError ? 'Dê um nome ao evento.' : undefined}
          accessibilityLabel="Nome do evento, obrigatório"
          reserveMessageSpace
        />
      </View>

      <View style={styles.field}>
        <TextField
          type="TextArea"
          label="Descrição do evento"
          hint="Opcional"
          value={data.description}
          onChangeText={onChangeDescription}
          placeholder="Conte o que vai rolar, quem pode ir e o que levar."
          maxLength={1000}
          accessibilityLabel="Descrição do evento, opcional"
        />
      </View>

      <View style={styles.field}>
        <FileUpload
          label="Capa"
          badge="Opcional"
          value={data.coverUri ? { uri: data.coverUri } : null}
          progress={progress}
          error={coverError ?? undefined}
          onPick={handlePickCover}
          onRemove={() => onChangeCover(null)}
          onCancel={cancel}
        />
      </View>

      <View style={styles.field} onLayout={rememberPosition('tags')}>
        <TagPicker
          tags={tags}
          isLoading={tagsLoading}
          error={tagsError}
          selectedIds={data.tagIds}
          showError={submitAttempted && areTagsMissing}
          onToggle={onToggleTag}
          onRetry={refetch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing[24],
  },
});
