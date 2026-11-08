import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { EditProfileForm } from '@/components/EditProfile/EditProfileForm';
import { ErrorScreen } from '@/components/ErrorScreen';
import { FloatingSaveButton } from '@/components/FloatingSaveButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRetryOnReconnect } from '@/hooks/useRetryOnReconnect';
import { useTags } from '@/hooks/useTags';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { fetchProfileForEdit } from '@/hooks/useUpdateProfile';
import { fetchUserTags } from '@/hooks/useUserTags';
import type { BusinessProfile, PersonalProfile, UserTag } from '@/types/profile';
import { describeLoadError, type LoadError } from '@/utils/apiErrors';
import { loadErrorScreenProps } from '@/utils/errorScreen';

type Loaded = {
  /** Visita em que os dados foram lidos — vira a `key` do formulário. */
  visit: number;
  profile: PersonalProfile | BusinessProfile;
  userTags: UserTag[];
};

function leaveScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/Profile');
}

/**
 * Editar perfil — uma tela só para pessoa física e estabelecimento. A variante
 * sai do `user_type` do usuário logado (`GET /users/me`), nunca de parâmetro;
 * o `userId` da rota só serve para barrar a edição do perfil de outra pessoa.
 */
export default function EditProfile() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { showErrorToast } = useToast();
  const { user, isLoading: isLoadingUser, error: userError, refetch: refetchUser } = useCurrentUser();
  const tagsTree = useTags();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Numa tab bar a tela continua montada ao sair: cada visita relê os dados e
  // monta um formulário novo, sem sobras da edição anterior.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((current) => current + 1), []));

  const isOtherUser = Boolean(user && userId && userId !== user.userId);

  useEffect(() => {
    if (!isOtherUser) return;
    showErrorToast('Você só pode editar o seu perfil');
    router.replace({ pathname: '/UserProfile', params: { id: userId } });
  }, [isOtherUser, userId, showErrorToast]);

  const userType = user?.userType;

  useEffect(() => {
    if (!user || isOtherUser || visit === 0) return;

    let isCurrent = true;
    setLoaded(null);
    setLoadError(null);

    Promise.all([fetchProfileForEdit(user), fetchUserTags()])
      .then(([profile, userTags]) => {
        if (isCurrent) setLoaded({ visit, profile, userTags });
      })
      .catch((caught) => {
        if (isCurrent) setLoadError(describeLoadError(caught));
      });

    return () => {
      isCurrent = false;
    };
  }, [user, isOtherUser, visit, attempt]);

  const closeRef = useRef<(() => void) | null>(null);
  const registerClose = useCallback((close: (() => void) | null) => {
    closeRef.current = close;
  }, []);

  useTopAppBar({
    variant: 'Modal',
    title: userType === 'BUSINESS' ? 'Editar estabelecimento' : 'Editar perfil',
    // Com alteração pendente, o formulário pergunta antes de sair.
    onBack: () => (closeRef.current ?? leaveScreen)(),
  });

  const error = userError ?? loadError;

  // Refaz só a leitura que falhou: a do usuário ou a do perfil + tags.
  const retryLoad = useCallback(() => {
    if (userError) void refetchUser();
    else setAttempt((current) => current + 1);
  }, [userError, refetchUser]);
  // Reconectou: refaz a carga que falhou sem o usuário tocar em nada.
  const { isOffline } = useRetryOnReconnect(Boolean(error?.canRetry), retryLoad);

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorScreen
          {...loadErrorScreenProps(error, {
            onRetry: retryLoad,
            onBack: leaveScreen,
            retryAccessibilityLabel: 'Tentar carregar o perfil novamente',
          })}
        />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  // O formulário só monta com tudo carregado (usuário, perfil, árvore de tags
  // e seleção atual), para o estado inicial dele sair direto dos dados.
  const isReady =
    user && !isLoadingUser && !isOtherUser && loaded && loaded.visit === visit && !tagsTree.isLoading;

  if (!isReady) {
    return (
      <View style={styles.screen} accessibilityLabel="Carregando perfil" accessibilityState={{ busy: true }}>
        <View style={styles.skeleton}>
          <View style={styles.skeletonAvatar} />
          {[0, 1, 2, 3, 4].map((index) => (
            <View key={index} style={styles.skeletonField} />
          ))}
        </View>
        <FloatingSaveButton onPress={() => {}} disabled />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  return (
    <EditProfileForm
      key={loaded.visit}
      user={user}
      profile={loaded.profile}
      userTags={loaded.userTags}
      tagsTree={tagsTree}
      onRegisterClose={registerClose}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  skeleton: {
    alignItems: 'center',
    gap: spacing[24],
    padding: spacing[16],
  },
  // Mesmo diâmetro do Avatar SM (64) e altura do TextField (52) do formulário.
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  skeletonField: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface.sunken,
  },
});
