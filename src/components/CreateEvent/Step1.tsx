import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
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

import { describeMissing, ErrorSummary, type MissingField } from './ErrorSummary';
import { FieldLabel } from './FieldLabel';
import { TagPicker } from './TagPicker';
import type { CreateEventFormData } from './types';

const FIELD_ORDER: MissingField[] = ['title', 'tags'];

const SCROLL_MARGIN = spacing[16];

export type Step1Handle = {
  submit: () => boolean;
};

type Step1Props = {
  data: CreateEventFormData;
  scrollRef: React.RefObject<ScrollView | null>;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeCover: (uri: string | null) => void;
  onToggleTag: (id: string) => void;
};


export const Step1 = forwardRef<Step1Handle, Step1Props>(function Step1(
  { data, scrollRef, onChangeTitle, onChangeDescription, onChangeCover, onToggleTag },
  ref,
) {
  const { tags, isLoading: tagsLoading, error: tagsError, refetch } = useTags();
  const {   pickImage, upload, cancel, isLoading: isUploadingCover, progress, error: coverError,
} = useImageUpload();

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fieldPositions = useRef<Record<MissingField, number>>({ title: 0, tags: 0 });

  const isTitleEmpty = data.title.trim().length === 0;
  const hasNoTags = data.tagIds.length === 0;

  const missing: MissingField[] = [];
  if (isTitleEmpty) missing.push('title');
  if (hasNoTags) missing.push('tags');

  // Validação do nome no blur (erro ao sair do campo vazio) depende de o
  // TextField repassar `onBlur` hoje ele não expõe essa prop e o componente
  // não pode ser editado. Por isso o erro do nome só aparece depois de tentar
  // avançar.
  const showTitleError = submitAttempted && isTitleEmpty;
  const showSummary = submitAttempted && missing.length > 0;

  const rememberPosition = (field: MissingField) => (event: LayoutChangeEvent) => {
    fieldPositions.current[field] = event.nativeEvent.layout.y;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
  setSubmitAttempted(true);

  if (isUploadingCover) {
    AccessibilityInfo.announceForAccessibility('Aguarde o envio da capa terminar.');
    return false;
  }

  if (missing.length === 0) return true;

      const firstMissing = FIELD_ORDER.find((field) => missing.includes(field)) ?? missing[0];
      setTimeout(() => {
        const targetY = Math.max(fieldPositions.current[firstMissing] - SCROLL_MARGIN, 0);
        scrollRef.current?.scrollTo({ y: targetY, animated: true });
        AccessibilityInfo.announceForAccessibility(describeMissing(missing));
      }, 0);

      return false;
    },
  }));

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
        <FieldLabel label="Nome do evento" required />
        <TextField
          type="Text"
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
        <FieldLabel label="Descrição do evento" hint="Opcional" />
        <TextField
          type="TextArea"
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
          showError={submitAttempted && hasNoTags}
          onToggle={onToggleTag}
          onRetry={refetch}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing[24],
  },
});
