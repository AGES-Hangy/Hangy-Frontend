import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProfileEventList } from '@/components/Profile/ProfileEventList';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { ProfileHeaderSkeleton } from '@/components/Profile/ProfileHeaderSkeleton';
import { ProfileTabs } from '@/components/ProfileTabs';
import { useToast } from '@/components/Toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfileEventsLoadMore } from '@/hooks/useProfileEventsLoadMore';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { useUserEvents } from '@/hooks/useUserEvents';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { UserEventsTab } from '@/types/user';
import { removeToken } from '@/utils/auth';
import type { LoadError } from '@/utils/apiErrors';

type OwnProfileTab = 'history' | 'events';
type OwnEventsSubTab = Extract<UserEventsTab, 'created' | 'interests' | 'confirmed'>;

const OWN_PROFILE_TABS = [
  { value: 'history', label: 'Histórico' },
  { value: 'events', label: 'Eventos' },
] as const satisfies ReadonlyArray<{ value: OwnProfileTab; label: string }>;

const OWN_EVENTS_SUBTABS = [
  { value: 'created', label: 'Criados' },
  { value: 'interests', label: 'Interesses' },
  { value: 'confirmed', label: 'Confirmados' },
] as const satisfies ReadonlyArray<{ value: OwnEventsSubTab; label: string }>;

const EMPTY_OWN_EVENTS: Record<UserEventsTab, { title: string; text: string }> = {
  history: { title: 'Nenhum evento no histórico', text: 'Os eventos que já aconteceram aparecem aqui.' },
  created: { title: 'Nenhum evento criado', text: 'Os eventos que você criar aparecem aqui.' },
  interests: { title: 'Nenhum evento salvo', text: 'Os eventos que você marcar como interesse aparecem aqui.' },
  confirmed: {
    title: 'Nenhuma presença confirmada',
    text: 'Os eventos em que você confirmar presença aparecem aqui.',
  },
};

export default function Profile() {
  // Sem `userId` é o perfil próprio; com, é o de outra pessoa ou de um
  // estabelecimento. O nome vem por parâmetro por enquanto — quando existir a
  // API de perfil, sai de um hook em `src/hooks/` no lugar disto.
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const isOwnProfile = !userId;

  const { user, error: userError, refetch: refetchUser } = useCurrentUser();
  // Só a pessoa física tem `GET /users/me/profile`; o estabelecimento fica no
  // placeholder até a etapa do perfil comercial.
  const isPersonalProfile = isOwnProfile && user?.userType === 'PERSONAL';
  const { profile, counts, error: profileError, reload: reloadProfile } = useMyProfile({
    enabled: isPersonalProfile,
  });
  // Ações em outras telas (criar, confirmar, favoritar) mudam as abas, e os
  // contadores não cobrem criar nem favoritar: a lista também recarrega no foco.
  const {
    tabs: eventTabs,
    isLoading: isLoadingEvents,
    error: eventsError,
    reload: reloadEvents,
    loadMore,
  } = useUserEvents(isPersonalProfile ? user?.userId : undefined, { reloadOnFocus: true });
  const [ownTab, setOwnTab] = useState<OwnProfileTab>('events');
  const [eventsSubTab, setEventsSubTab] = useState<OwnEventsSubTab>('created');
  const { unregisterDevice } = useUnregisterDevice();
  const { isOffline } = useNetworkStatus();
  const { loadMoreButtonRef, handleLoadMore } = useProfileEventsLoadMore({ tabs: eventTabs, loadMore, isOffline });
  const { addToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    // Antes de removeToken porque o DELETE precisa do Bearer. Logout
    // voluntário não deve exibir sessão expirada se a API responder 401.
    await unregisterDevice({ isLoggingOut: true });
    await removeToken();
    router.replace('/Login');
  }

  function openEditProfile() {
    router.push({ pathname: '/EditProfile', params: user ? { userId: user.userId } : {} });
  }

  useTopAppBar(
    isOwnProfile
      ? {
          variant: 'Profile',
          // Numa conta de estabelecimento o título é o nome do estabelecimento
          // em vez de "Meu perfil" — trocar assim que existir o usuário logado.
          title: 'Meu perfil',
          // Raiz de aba: não veio de lugar nenhum, então não tem voltar.
          showBack: false,
        }
      : {
          variant: 'Profile',
          title: name ?? 'Perfil',
          action: {
            icon: 'flag',
            accessibilityLabel: 'Denunciar perfil',
            // A US11.1 pluga o fluxo de denúncia aqui.
            onPress: () => {},
          },
        },
  );

  // Tipo do último erro de recarga já avisado: cada volta ao foco gera um erro
  // novo, e sem a chave a mesma falha seria avisada a cada retorno à aba.
  const feedbackKey = useRef<string | null>(null);

  const retryProfile = useCallback(() => {
    feedbackKey.current = null;
    void reloadProfile();
  }, [reloadProfile]);

  const retryEvents = useCallback(() => {
    feedbackKey.current = null;
    void reloadEvents();
  }, [reloadEvents]);

  // O toast guarda o `retryFailed` de quando apareceu: o que falhou é lido no
  // toque, e só isso recarrega.
  const failed = useRef({ profile: false, events: false });
  useEffect(() => {
    failed.current = { profile: profileError !== null, events: eventsError !== null };
  }, [eventsError, profileError]);

  const retryFailed = useCallback(() => {
    feedbackKey.current = null;
    if (failed.current.profile) void reloadProfile();
    if (failed.current.events) void reloadEvents();
  }, [reloadEvents, reloadProfile]);

  const reloadFailure =
    profile && profileError ? profileError : profile && eventTabs && eventsError ? eventsError : null;

  // A recarga dos eventos limpa o erro ao começar; só uma resposta sem erro
  // libera um novo aviso.
  useEffect(() => {
    if (!profileError && !eventsError && !isLoadingEvents) feedbackKey.current = null;
  }, [eventsError, isLoadingEvents, profileError]);

  useEffect(() => {
    if (!reloadFailure || feedbackKey.current === reloadFailure.kind) return;
    feedbackKey.current = reloadFailure.kind;

    if (reloadFailure.kind === 'timeout' || reloadFailure.kind === 'server') {
      addToast({ type: 'error', message: reloadFailure.message, actionLabel: 'Tentar de novo', onAction: retryFailed });
    } else if (!isOffline) {
      addToast({ type: 'error', message: reloadFailure.message });
    }
  }, [addToast, isOffline, reloadFailure, retryFailed]);

  const logoutButton = (
    <Button
      label="Sair da conta"
      variant="Secondary"
      onPress={handleLogout}
      isLoading={isLoggingOut}
      style={styles.fullWidth}
    />
  );

  if (isOwnProfile && !user) {
    return userError ? (
      <LoadErrorState error={userError} onRetry={refetchUser} logoutButton={logoutButton} offline={isOffline} />
    ) : (
      <ProfileSkeleton offline={isOffline} />
    );
  }

  if (isPersonalProfile) {
    if (!profile || !counts) {
      return profileError ? (
        <LoadErrorState error={profileError} onRetry={retryProfile} logoutButton={logoutButton} offline={isOffline} />
      ) : (
        <ProfileSkeleton offline={isOffline} />
      );
    }

    const eventsCount = counts.confirmed + counts.past;
    const activeEventsTab: UserEventsTab = ownTab === 'history' ? 'history' : eventsSubTab;
    const activeEvents = eventTabs ? eventTabs[activeEventsTab] : null;

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}>
          <ProfileHeader
            photoUrl={profile.photo_url}
            avatarVariant="User"
            stats={[
              { value: profile.connections_count, label: profile.connections_count === 1 ? 'Conexão' : 'Conexões' },
              { value: eventsCount, label: eventsCount === 1 ? 'Evento' : 'Eventos' },
              { value: counts.photos, label: counts.photos === 1 ? 'Foto' : 'Fotos' },
            ]}
            name={profile.name?.trim() || null}
            description={profile.description?.trim() || null}
            tags={profile.tags}
            actions={
              <Button label="Editar perfil" variant="Secondary" onPress={openEditProfile} style={styles.fullWidth} />
            }
          />

          <View style={styles.tabsWrap}>
            <ProfileTabs items={OWN_PROFILE_TABS} value={ownTab} onChange={setOwnTab} />
          </View>
          {ownTab === 'events' && (
            <View style={styles.tabsWrap}>
              <ProfileTabs
                items={OWN_EVENTS_SUBTABS}
                value={eventsSubTab}
                onChange={setEventsSubTab}
                variant="listHeader"
              />
            </View>
          )}

          <ProfileEventList
            items={eventTabs ? (activeEvents?.items ?? []) : null}
            loadFailed={eventsError !== null}
            onRetry={retryEvents}
            empty={EMPTY_OWN_EVENTS[activeEventsTab]}
            hasMore={activeEvents?.hasMore ?? false}
            isLoadingMore={activeEvents?.loadingMore ?? false}
            onLoadMore={() => handleLoadMore(activeEventsTab)}
            loadMoreButtonRef={loadMoreButtonRef}
            cardState={activeEventsTab === 'confirmed' ? 'Confirmed' : undefined}
          />

          {/* No Figma, "Sair da conta" fica no Editar perfil; aqui é o único logout do app por enquanto. */}
          <View style={styles.logoutRow}>{logoutButton}</View>
        </ScrollView>
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{isOwnProfile ? 'Profile' : name}</Text>
      {isOwnProfile && (
        <Button
          label="Editar perfil"
          variant="Secondary"
          // A mesma rota para pessoa física e estabelecimento: a variante sai
          // do tipo da conta logada, dentro da tela.
          onPress={() =>
            router.push({ pathname: '/EditProfile', params: user ? { userId: user.userId } : {} })
          }
          style={styles.logout}
        />
      )}
      {isOwnProfile && (
        <Button
          label="Sair"
          variant="Secondary"
          onPress={handleLogout}
          isLoading={isLoggingOut}
          accessibilityLabel="Sair da conta"
          style={styles.logout}
        />
      )}
    </View>
  );
}

function ProfileSkeleton({ offline }: { offline: boolean }) {
  return (
    <View style={styles.screen}>
      <View
        style={[styles.content, offline && styles.contentOffline]}
        accessible
        accessibilityLabel="Carregando perfil"
        accessibilityRole="progressbar"
      >
        <ProfileHeaderSkeleton />
      </View>
      {offline && <OfflineBanner />}
    </View>
  );
}

function LoadErrorState({
  error,
  onRetry,
  logoutButton,
  offline,
}: {
  error: LoadError;
  onRetry: () => void;
  logoutButton: ReactNode;
  offline: boolean;
}) {
  return (
    <View style={styles.stateScreen}>
      <EmptyState context="Search" title={error.title} text={error.message} cta ctaLabel="Tentar de novo" onCtaPress={onRetry} />
      {/* Sem o perfil, esta é a única saída da conta. */}
      <View style={styles.logoutRow}>{logoutButton}</View>
      {offline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.primary,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.action.secondary,
  },
  logout: {
    marginTop: spacing[24],
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  stateScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
  },
  content: {
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[8],
  },
  // Mesmo respiro de `UserProfile`: o `OfflineBanner` é absoluto e cobriria o topo.
  contentOffline: {
    paddingTop: spacing[64],
  },
  // O `ProfileTabs` ocupa 100% do contêiner: a margem lateral vem de fora,
  // como o "TabsWrap" dos frames.
  tabsWrap: {
    paddingHorizontal: spacing[16],
  },
  logoutRow: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
