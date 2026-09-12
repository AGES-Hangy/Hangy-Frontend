import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, type ScrollView, StyleSheet, View } from 'react-native';

import { FileUpload } from '@/components/FileUpload';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/layout';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTags } from '@/hooks/useTags';

import { describeMissing, ErrorSummary } from '@/components/CreateEvent/ErrorSummary';
import { TagPicker } from '@/components/CreateEvent/TagPicker';
import type { CreateEventFormData, MissingField } from '@/components/CreateEvent/types';

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

  const titleRef = useRef<View>(null);
  const tagsRef = useRef<View>(null);
  const fieldRefs: Record<MissingField, React.RefObject<View | null>> = {
    title: titleRef,
    tags: tagsRef,
  };

  const submitAttempted = submitCount > 0;
  const isTitleMissing = missing.includes('title');
  const areTagsMissing = missing.includes('tags');

  // O erro do nome aparece ao sair do campo vazio e também ao tocar
  // "Continuar" — daí o `titleBlurred` somado ao `submitAttempted`. O foco
  // zera o `titleBlurred`: a validação espera a pessoa terminar de editar, em
  // vez de acusar erro no meio de um apagar-e-reescrever.
  const [titleBlurred, setTitleBlurred] = useState(false);
  const showTitleError = (submitAttempted || titleBlurred) && isTitleMissing;
  const showSummary = submitAttempted && missing.length > 0;

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

    AccessibilityInfo.announceForAccessibility(describeMissing(missing));

    // `validateStep1` devolve as pendências na ordem da tela, então a primeira
    // da lista é a que precisa entrar em foco.
    const firstMissing = missing[0];
    const node = fieldRefs[firstMissing].current;
    const scroll = scrollRef.current;
    // Content container, não o nó externo: na web o `measureLayout` do RNW
    // devolve `y` relativo à viewport, já descontado o scroll atual, e o alvo
    // sairia errado com a página rolada.
    const contentNode = scroll?.getInnerViewNode();
    if (!node || !scroll || !contentNode) return;

    // Medido agora, e não no `onLayout`: o ErrorSummary entra acima dos campos
    // neste mesmo render, então qualquer posição guardada antes do toque já
    // nasce defasada.
    node.measureLayout(contentNode, (_x, y) => {
      scroll.scrollTo({ y: Math.max(y - SCROLL_MARGIN, 0), animated: true });
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

      <View style={styles.field} ref={titleRef}>
        <TextField
          type="Text"
          label="Nome do evento"
          required
          value={data.title}
          onChangeText={onChangeTitle}
          onFocus={() => setTitleBlurred(false)}
          onBlur={() => setTitleBlurred(true)}
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

      <View style={styles.field} ref={tagsRef}>
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
