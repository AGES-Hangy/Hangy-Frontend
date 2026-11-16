import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TextField } from '@/components/TextField';
import { TopAppBar } from '@/components/TopAppBar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useAdminTagMutations, useTagFailureFeedback } from '@/hooks/useAdminTagMutations';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  TAG_NAME_CONFLICT_MESSAGE,
  TAG_NAME_MAX_LENGTH,
  validateTagName,
} from '@/utils/adminTags';

const OFFLINE_BANNER_OFFSET = spacing[64];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Tags');
}

export default function NovaCategoria() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const { createTag, isLoading } = useAdminTagMutations();
  const reportFailure = useTagFailureFeedback();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { value, isValid } = validateTagName(name);
  const canSubmit = isValid && !isLoading && !isOffline;

  async function submit() {
    if (!canSubmit) return;

    const result = await createTag(value, null);
    // Respostas atrasadas depois de sair da tela não navegam nem mexem no estado.
    if (!isMounted.current) return;

    switch (result.kind) {
      case 'done':
        // A visão geral refaz o `GET /tags/tree` ao voltar a ter foco.
        goBack();
        return;
      case 'name-conflict':
        setNameError(TAG_NAME_CONFLICT_MESSAGE);
        return;
      case 'invalid-field':
        setNameError(result.message);
        return;
      case 'ignored':
        return;
      default:
        reportFailure(result, () => void submit());
    }
  }

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Nova categoria" applyTopInset={false} onBack={goBack} />
      <View style={styles.body}>
        <KeyboardAvoidingView
          style={[styles.body, isOffline && styles.bodyBelowBanner]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextField
              label="Nome da categoria"
              placeholder="Vida Noturna"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError(undefined);
              }}
              maxLength={TAG_NAME_MAX_LENGTH}
              error={nameError}
              disabled={isLoading}
              autoCapitalize="sentences"
              onSubmitEditing={() => void submit()}
              reserveMessageSpace
            />
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: spacing[16] + insets.bottom }]}>
            <Button
              label="Criar categoria"
              size="LG"
              disabled={!isValid || isOffline}
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
  content: { padding: spacing[16], gap: spacing[16] },
  footer: {
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
  },
});