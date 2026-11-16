import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Dialog } from '@/components/Dialog';
import { ErrorScreen } from '@/components/ErrorScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { TopAppBar } from '@/components/TopAppBar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminTagMutations, useTagFailureFeedback } from '@/hooks/useAdminTagMutations';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTags } from '@/hooks/useTags';
import type { TagLeaf } from '@/hooks/useTags';
import {
  TAG_NAME_CONFLICT_MESSAGE,
  TAG_NAME_MAX_LENGTH,
  validateTagName,
} from '@/utils/adminTags';

const OFFLINE_BANNER_OFFSET = spacing[64];
/** Altura do `Chip` `md`; o componente não exporta a constante. */
const CHIP_HEIGHT = 36;
const SKELETON_CHIPS = 5;

type DialogState =
  | { kind: 'remove-tag'; tag: TagLeaf }
  /** Passo 2 da remoção: o 409 `Tag is in use` já veio, falta a confirmação do `force=true`. */
  | { kind: 'tag-in-use'; tag: TagLeaf; usageCount: number | null }
  | { kind: 'remove-category' }
  | { kind: 'category-blocked' }
  | null;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Tags');
}

function inUseDescription(usageCount: number | null) {
  if (usageCount === null) {
    return 'Esta tag está em uso por eventos e usuários. Removê-la agora desassocia todos eles.';
  }
  if (usageCount === 1) {
    return 'Esta tag é usada por 1 evento ou usuário. Removê-la agora desassocia esse vínculo.';
  }
  return `Esta tag é usada por ${usageCount} eventos e usuários. Removê-la agora desassocia todos eles.`;
}

function blockedDescription(tagCount: number) {
  const remaining = tagCount === 1 ? 'Remova a tag dela' : `Remova as ${tagCount} tags dela`;
  return `Esta categoria só pode ser removida quando estiver vazia. ${remaining} antes de continuar.`;
}

function EditSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando categoria"
      accessibilityState={{ busy: true }}
    >
      <Skeleton height={typography.labelM.lineHeight} width="40%" radius="full" />
      <Skeleton height={spacing[48]} radius="md" />
      <Skeleton height={14} width="25%" radius="full" />
      <View style={styles.chips}>
        {Array.from({ length: SKELETON_CHIPS }, (_, index) => (
          <Skeleton key={index} width={80} height={CHIP_HEIGHT} radius="full" />
        ))}
      </View>
    </View>
  );
}

export default function EditarCategoria() {
  const params = useLocalSearchParams<{ categoryId?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;

  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const { tags, isLoading: isLoadingTags, error: tagsError, refetch } = useTags();
  const { renameTag, deleteTag } = useAdminTagMutations();
  const reportFailure = useTagFailureFeedback();

  const category = tags.find((node) => node.id === categoryId) ?? null;

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [pending, setPending] = useState<'rename' | 'delete' | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const initializedFor = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // O campo parte do nome da categoria uma vez só: os recarregamentos não apagam o que
  // a pessoa está digitando.
  useEffect(() => {
    if (category && initializedFor.current !== category.id) {
      initializedFor.current = category.id;
      setName(category.name);
    }
  }, [category]);

  const { value, isValid } = validateTagName(name);
  const canSave = category !== null && isValid && value !== category.name && pending === null && !isOffline;

  async function save() {
    if (!category || !canSave) return;

    setPending('rename');
    const result = await renameTag(category.id, value);
    if (!isMounted.current) return;
    setPending(null);

    switch (result.kind) {
      case 'done':
        setName(value);
        addToast({ type: 'success', message: 'Categoria renomeada.' });
        void refetch();
        return;
      case 'name-conflict':
        setNameError(TAG_NAME_CONFLICT_MESSAGE);
        return;
      case 'invalid-field':
        setNameError(result.message);
        return;
      case 'not-found':
        addToast({ type: 'warning', message: 'Esta categoria não existe mais.' });
        router.replace('/Admin/Tags');
        return;
      case 'ignored':
        return;
      default:
        reportFailure(result, () => void save());
    }
  }

  async function removeTag(tag: TagLeaf, force: boolean) {
    setPending('delete');
    const result = await deleteTag(tag.id, force ? { force: true } : undefined);
    if (!isMounted.current) return;
    setPending(null);

    switch (result.kind) {
      case 'done':
        setDialog(null);
        addToast({ type: 'success', message: `Tag ${tag.name} removida.` });
        void refetch();
        return;
      case 'in-use':
        // Passo 1 → confirmação extra. Se o 409 vier já com `force`, não insiste: avisa.
        if (!force) {
          setDialog({ kind: 'tag-in-use', tag, usageCount: result.usageCount });
          return;
        }
        setDialog(null);
        addToast({ type: 'error', message: 'Não foi possível remover a tag. Tente de novo.' });
        return;
      case 'not-found':
        setDialog(null);
        addToast({ type: 'warning', message: 'Esta tag não existe mais. Atualizamos a lista.' });
        void refetch();
        return;
      case 'ignored':
        return;
      default:
        setDialog(null);
        reportFailure(result);
    }
  }

  /** "Remover categoria" sempre toca; a contagem de tags já está na tela e escolhe o diálogo. */
  function askRemoveCategory() {
    if (!category) return;
    setDialog(category.children.length > 0 ? { kind: 'category-blocked' } : { kind: 'remove-category' });
  }

  async function removeCategory() {
    if (!category) return;

    setPending('delete');
    const result = await deleteTag(category.id);
    if (!isMounted.current) return;
    setPending(null);

    switch (result.kind) {
      case 'done':
        addToast({ type: 'success', message: `Categoria ${category.name} removida.` });
        // `replace`, e não `back()`: não deixa no histórico uma categoria que não existe mais.
        router.replace('/Admin/Tags');
        return;
      case 'has-tags':
        // O backend discordou da lista local (tag criada por fora): mostra o bloqueio.
        setDialog({ kind: 'category-blocked' });
        void refetch();
        return;
      case 'not-found':
        addToast({ type: 'warning', message: 'Esta categoria não existe mais.' });
        router.replace('/Admin/Tags');
        return;
      case 'ignored':
        return;
      default:
        setDialog(null);
        reportFailure(result);
    }
  }

  function closeDialog() {
    if (pending !== 'delete') setDialog(null);
  }

  function renderBody() {
    if (!category && isLoadingTags) return <EditSkeleton />;

    if (!category && tagsError) {
      return (
        <ErrorScreen
          title={isOffline ? 'Sem conexão' : 'Não foi possível carregar'}
          message={isOffline ? 'Sem conexão com a internet' : 'Não foi possível carregar. Tente de novo.'}
          tone={isOffline ? 'warning' : 'error'}
          action={{ label: 'Tentar de novo', onPress: () => void refetch(), isLoading: isLoadingTags }}
          withBottomInset
        />
      );
    }

    if (!category) {
      return (
        <ErrorScreen
          title="Categoria não encontrada"
          message="Esta categoria não existe mais. Atualize a lista e tente de novo."
          tone="neutral"
          action={{ label: 'Voltar', onPress: () => router.replace('/Admin/Tags') }}
          withBottomInset
        />
      );
    }

    return (
      <>
        <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextField
              label="Nome da categoria"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError(undefined);
              }}
              maxLength={TAG_NAME_MAX_LENGTH}
              error={nameError}
              disabled={pending === 'rename'}
              autoCapitalize="sentences"
              onSubmitEditing={() => void save()}
              reserveMessageSpace
            />

            <SectionHeader title={`TAGS (${category.children.length})`} variant="overline" />
            {category.children.length === 0 ? (
              <Text style={styles.messageText}>Esta categoria ainda não tem tags.</Text>
            ) : (
              <View style={styles.chips}>
                {category.children.map((tag) => (
                  // O Design System não tem `Level=Micro, Removable=True`: usa a variante macro
                  // removível, como a task orienta (o fill tonal certo pede nova variante no `Chip`).
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    categoryType="macro"
                    size="md"
                    isSelected
                    showRemoveIcon
                    accessibilityLabel={`Tag ${tag.name}`}
                    onRemove={() => setDialog({ kind: 'remove-tag', tag })}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
            <Button
              label="Salvar"
              size="LG"
              disabled={!canSave}
              isLoading={pending === 'rename'}
              onPress={() => void save()}
            />
            <Button
              label="Remover categoria"
              variant="DangerText"
              size="MD"
              disabled={isOffline || pending !== null}
              onPress={askRemoveCategory}
            />
          </View>
        </KeyboardAvoidingView>

        {dialog?.kind === 'remove-tag' && (
          <Dialog
            visible
            variant="RemoveTagArea"
            title={`Remover ${dialog.tag.name}?`}
            description={`Esta tag será removida da categoria ${category.name}.`}
            confirmLabel="Remover tag"
            cancelLabel="Cancelar"
            confirmDisabled={isOffline}
            isLoading={pending === 'delete'}
            onConfirm={() => void removeTag(dialog.tag, false)}
            onCancel={closeDialog}
          />
        )}

        {dialog?.kind === 'tag-in-use' && (
          <Dialog
            visible
            variant="RemoveTagArea"
            title={`Remover ${dialog.tag.name}?`}
            description={inUseDescription(dialog.usageCount)}
            confirmLabel="Remover tag"
            cancelLabel="Cancelar"
            confirmDisabled={isOffline}
            isLoading={pending === 'delete'}
            onConfirm={() => void removeTag(dialog.tag, true)}
            onCancel={closeDialog}
          />
        )}

        {dialog?.kind === 'remove-category' && (
          <Dialog
            visible
            variant="RemoveTagArea"
            title={`Remover ${category.name}?`}
            description="A categoria está vazia. Esta ação não pode ser desfeita."
            confirmLabel="Remover categoria"
            cancelLabel="Cancelar"
            confirmDisabled={isOffline}
            isLoading={pending === 'delete'}
            onConfirm={() => void removeCategory()}
            onCancel={closeDialog}
          />
        )}

        {dialog?.kind === 'category-blocked' && (
          <Dialog
            visible
            variant="RemoveTagArea"
            title={`Remover ${category.name}?`}
            description={blockedDescription(category.children.length)}
            confirmLabel="Entendi"
            cancelLabel="Ver tags da categoria"
            onConfirm={closeDialog}
            onCancel={closeDialog}
          />
        )}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Editar categoria" applyTopInset={false} onBack={goBack} />
      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>{renderBody()}</View>
        {isOffline && <OfflineBanner />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  body: { flex: 1 },
  bodyBelowBanner: { paddingTop: OFFLINE_BANNER_OFFSET },
  content: { padding: spacing[16], gap: spacing[16] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  messageText: { ...typography.bodyM, color: colors.text.secondary },
  footer: {
    gap: spacing[8],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
  },
});