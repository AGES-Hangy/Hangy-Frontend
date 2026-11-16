import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { OfflineBanner } from '@/components/OfflineBanner';
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
import {
  TAG_NAME_CONFLICT_MESSAGE,
  TAG_NAME_MAX_LENGTH,
  validateTagName,
} from '@/utils/adminTags';

const OFFLINE_BANNER_OFFSET = spacing[64];
/** Altura do `Chip` `md`; o componente não exporta a constante. */
const CHIP_HEIGHT = 36;
const SKELETON_CHIPS = 3;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Tags');
}

export default function NovaTag() {
  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { isOffline } = useNetworkStatus();
  // Mesmo hook de leitura das outras telas: não há segundo `GET /tags/tree`.
  const { tags, isLoading: isLoadingTags, error: tagsError, refetch } = useTags();
  const { createTag, isLoading } = useAdminTagMutations();
  const reportFailure = useTagFailureFeedback();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Se o recarregamento tirar a categoria escolhida, é como se nenhuma estivesse marcada.
  const selected = tags.find((category) => category.id === categoryId) ?? null;
  const { value, isValid } = validateTagName(name);
  const canSubmit = isValid && selected !== null && !isLoading && !isOffline;

  async function submit() {
    if (!canSubmit || !selected) return;

    const result = await createTag(value, selected.id);
    if (!isMounted.current) return;

    switch (result.kind) {
      case 'done':
        goBack();
        return;
      case 'name-conflict':
        setNameError(TAG_NAME_CONFLICT_MESSAGE);
        return;
      case 'invalid-field':
        setNameError(result.message);
        return;
      case 'parent-not-found':
        addToast({
          type: 'error',
          message: 'Categoria não encontrada. Atualize a lista e tente de novo.',
        });
        setCategoryId(null);
        void refetch();
        return;
      case 'ignored':
        return;
      default:
        reportFailure(result, () => void submit());
    }
  }

  function renderCategories() {
    if (tags.length === 0 && isLoadingTags) {
      return (
        <View
          style={styles.chips}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Carregando categorias"
          accessibilityState={{ busy: true }}
        >
          {Array.from({ length: SKELETON_CHIPS }, (_, index) => (
            <Skeleton key={index} width={96} height={CHIP_HEIGHT} radius="full" />
          ))}
        </View>
      );
    }

    if (tags.length === 0 && tagsError) {
      return (
        <View style={styles.categoriesMessage}>
          <Text style={styles.messageText}>Não foi possível carregar as categorias.</Text>
          <Button label="Tentar de novo" variant="Tertiary" size="SM" onPress={() => void refetch()} />
        </View>
      );
    }

    if (tags.length === 0) {
      return <Text style={styles.messageText}>Crie uma categoria antes de criar uma tag.</Text>;
    }

    return (
      <View style={styles.chips}>
        {tags.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            categoryType="macro"
            size="md"
            isSelected={category.id === selected?.id}
            accessibilityLabel={`Categoria ${category.name}`}
            onPress={() => {
              if (isLoading) return;
              setCategoryId((current) => (current === category.id ? null : category.id));
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Nova tag" applyTopInset={false} onBack={goBack} />
      <View style={styles.body}>
        <KeyboardAvoidingView
          style={[styles.body, isOffline && styles.bodyBelowBanner]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextField
              label="Nome da tag"
              placeholder="Escalada indoor"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError(undefined);
              }}
              maxLength={TAG_NAME_MAX_LENGTH}
              error={nameError}
              disabled={isLoading}
              autoCapitalize="sentences"
              reserveMessageSpace
            />
            <View style={styles.categories}>
              <Text style={styles.categoryTitle}>CATEGORIA</Text>
              {renderCategories()}
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
            <Button
              label="Criar tag"
              size="LG"
              disabled={!canSubmit}
              isLoading={isLoading}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
        {isOffline && <OfflineBanner />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  body: { flex: 1 },
  bodyBelowBanner: { paddingTop: OFFLINE_BANNER_OFFSET },
  content: { padding: spacing[16] },
  categories: { gap: spacing[8], marginTop: -spacing[8] },
  categoriesMessage: { gap: spacing[8], alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  messageText: { ...typography.bodyM, color: colors.text.secondary },
  footer: {
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
  },
  categoryTitle: {
    ...typography.overline,
    color: colors.text.primary,
  },
});