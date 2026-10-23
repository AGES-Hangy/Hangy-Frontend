import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, type ScrollView, StyleSheet, View } from 'react-native';

import { FileUpload } from '@/components/FileUpload';
import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/layout';
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
  /** Só definido enquanto a capa está sendo enviada. */
  coverProgress?: number;
  coverError: string | null;
  /** A capa foi recusada ao publicar: rolar até o campo e levar o foco a ele. */
  focusCover: boolean;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onPickCover: () => void;
  onCancelCover: () => void;
  onRemoveCover: () => void;
  onCoverFocused: () => void;
  onToggleTag: (id: string) => void;
};

export function Step1({
  data,
  scrollRef,
  missing,
  submitCount,
  coverProgress,
  coverError,
  focusCover,
  onChangeTitle,
  onChangeDescription,
  onPickCover,
  onCancelCover,
  onRemoveCover,
  onCoverFocused,
  onToggleTag,
}: Step1Props) {
  const { tags, isLoading: tagsLoading, error: tagsError, refetch } = useTags();

  const containerRef = useRef<View>(null);
  const titleRef = useRef<View>(null);
  const coverRef = useRef<View>(null);
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

  const scrollToField = (node: View) => {
    const scroll = scrollRef.current;
    // Content container, não o nó externo: na web o `measureLayout` do RNW
    // devolve `y` relativo à viewport, já descontado o scroll atual, e o alvo
    // sairia errado com a página rolada. E não `scroll.getInnerViewNode()`
    // para chegar nesse container: na New Architecture (Fabric) esse método
    // devolve um número de tag nativa, e `measureLayout` exige uma ref de
    // componente nativo — passar o número faz a chamada virar no-op
    // silencioso. Como o Step1 é o único filho do ScrollView, sua própria
    // raiz já é esse container.
    const contentNode = containerRef.current;
    if (!scroll || !contentNode) return;

    node.measureLayout(contentNode, (_x, y) => {
      scroll.scrollTo({ y: Math.max(y - SCROLL_MARGIN, 0), animated: true });
    });
  };

  // Só `submitCount` nas dependências: o efeito reage ao toque em "Continuar",
  // não às mudanças do formulário, e lê o `missing` do render em que o contador
  // subiu.
  useEffect(() => {
    if (submitCount === 0) return;

    if (missing.length === 0) return;

    AccessibilityInfo.announceForAccessibility(describeMissing(missing));

    // `validateStep1` devolve as pendências na ordem da tela, então a primeira
    // da lista é a que precisa entrar em foco.
    const firstMissing = missing[0];
    const node = fieldRefs[firstMissing].current;
    if (!node) return;

    // Medido agora, e não no `onLayout`: o ErrorSummary entra acima dos campos
    // neste mesmo render, então qualquer posição guardada antes do toque já
    // nasce defasada.
    scrollToField(node);
  }, [submitCount]);

  // No `onLayout`, e não num efeito: o 400 da capa chega na etapa 2, então o
  // Step1 monta no mesmo render em que `focusCover` liga, e a posição do campo
  // só é confiável depois do primeiro layout.
  const handleCoverLayout = () => {
    const node = coverRef.current;
    if (!focusCover || !node) return;

    scrollToField(node);
    // O react-native-web não implementa `sendAccessibilityEvent`; chamá-lo no
    // web derruba a tela.
    if (Platform.OS !== 'web') AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
    onCoverFocused();
  };

  return (
    <View ref={containerRef}>
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

      <View style={styles.field} ref={coverRef} onLayout={handleCoverLayout}>
        <FileUpload
          label="Capa"
          badge="Opcional"
          value={data.coverUri ? { uri: data.coverUri } : null}
          progress={coverProgress}
          error={coverError ?? undefined}
          onPick={onPickCover}
          onCancel={onCancelCover}
          onRemove={onRemoveCover}
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
