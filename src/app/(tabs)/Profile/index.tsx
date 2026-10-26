import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PhotoViewer } from '@/components/PhotoViewer';
import type { PhotoViewerItem } from '@/components/PhotoViewer';
import { ProfileEventList } from '@/components/Profile/ProfileEventList';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { ProfileHeaderSkeleton } from '@/components/Profile/ProfileHeaderSkeleton';
import { ProfilePhotoGrid } from '@/components/Profile/ProfilePhotoGrid';
import { ProfileTabs } from '@/components/ProfileTabs';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { updateExperienceDescription } from '@/hooks/useExperiencePhotos';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfileEventsLoadMore } from '@/hooks/useProfileEventsLoadMore';
import { useProfilePhotosLoadMore } from '@/hooks/useProfilePhotosLoadMore';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { useUserEvents } from '@/hooks/useUserEvents';
import { useUserProfile } from '@/hooks/useUserProfile';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import type { UserEventsTab } from '@/types/user';
import { removeToken } from '@/utils/auth';
import type { LoadError } from '@/utils/apiErrors';
import { endpoints } from '@/constants/api';
import { ApiError, apiFetch } from '@/utils/http';
import { toPhotoViewerItems } from '@/utils/photoViewer';

type OwnProfileTab = 'history' | 'events' | 'gallery';
type OwnEventsSubTab = Extract<UserEventsTab, 'created' | 'interests' | 'confirmed'>;

const OWN_PROFILE_TABS = [
  { value: 'history', label: 'Histórico' },
  { value: 'events', label: 'Eventos' },
  { value: 'gallery', label: 'Galeria' },
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

const EMPTY_GALLERY = {
  title: 'Nenhuma foto ainda',
  text: 'Você ainda não adicionou fotos aos eventos de que participou.',
};

/** Perfil próprio. O de outra pessoa ou de um estabelecimento fica em `/UserProfile?id=`. */
export default function Profile() {
  const { user, error: userError, refetch: refetchUser } = useCurrentUser();
  // Só a pessoa física tem `GET /users/me/profile`; o estabelecimento fica no
  // `BusinessOwnProfile`, mais abaixo.
  const isPersonalProfile = user?.userType === 'PERSONAL';
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
  // As fotos só carregam na primeira vez que a Galeria abre, e continuam
  // carregadas ao trocar de aba.
  const [hasOpenedGallery, setHasOpenedGallery] = useState(false);
  const {
    photos,
    isLoading: isLoadingPhotos,
    error: photosError,
    hasMore: hasMorePhotos,
    isLoadingMore: isLoadingMorePhotos,
    loadMoreError: photosLoadMoreError,
    loadMore: loadMorePhotos,
    reload: reloadPhotos,
    removeLocal: removeLocalPhoto,
    updateLocalDescription,
  } = useMyPhotos({ enabled: isPersonalProfile && hasOpenedGallery });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const closeViewer = useCallback(() => setViewerIndex(null), []);
  const { unregisterDevice } = useUnregisterDevice();
  const { isOffline } = useNetworkStatus();
  const { loadMoreButtonRef, handleLoadMore } = useProfileEventsLoadMore({ tabs: eventTabs, loadMore, isOffline });
  const { loadMoreButtonRef: loadMorePhotosButtonRef, handleLoadMore: handleLoadMorePhotos } =
    useProfilePhotosLoadMore({
      photos,
      hasMore: hasMorePhotos,
      isLoadingMore: isLoadingMorePhotos,
      loadMoreError: photosLoadMoreError,
      loadMore: loadMorePhotos,
      isOffline,
    });
  const { addToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // A barra é uma só por tela: o `BusinessOwnProfile` devolve o nome para o título.
  const [businessName, setBusinessName] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);
    // Antes de removeToken porque o DELETE precisa do Bearer. Logout
    // voluntário não deve exibir sessão expirada se a API responder 401.
    await unregisterDevice({ isLoggingOut: true });
    await removeToken();
    router.replace('/Login');
  }

  function selectOwnTab(tab: OwnProfileTab) {
    setOwnTab(tab);
    if (tab === 'gallery') setHasOpenedGallery(true);
  }

  // Sem recarga das fotos no foco: a recarga do perfil traz o contador, e só a
  // mudança dele recarrega a Galeria já aberta.
  const photosCount = counts?.photos;
  const hasPhotos = photos !== null;
  const lastPhotosCount = useRef<number | undefined>(undefined);
  useEffect(() => {
    const previous = lastPhotosCount.current;
    lastPhotosCount.current = photosCount;
    if (hasPhotos && previous !== undefined && photosCount !== undefined && previous !== photosCount) {
      void reloadPhotos();
    }
  }, [hasPhotos, photosCount, reloadPhotos]);

  // Fotos da própria galeria: a pessoa é a autora, então pode excluir todas.
  async function deletePhoto(photo: PhotoViewerItem) {
    try {
      await apiFetch<void>(endpoints.experienceImage(photo.id), { method: 'DELETE' });
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) return false;
      // `Photo not found`: já tinha saído, então o pedido vale.
      if (apiError.status !== 404) {
        addToast({
          type: 'error',
          message:
            apiError.kind === 'network'
              ? 'Sem conexão com a internet'
              : apiError.kind === 'timeout'
                ? 'A conexão demorou demais'
                : 'Não foi possível excluir a foto. Tente de novo.',
        });
        return false;
      }
    }
    removeLocalPhoto(photo.id);
    // O contador de Fotos vem do perfil.
    void reloadProfile();
    addToast({ type: 'success', message: 'Foto excluída.' });
    return true;
  }

  // Fotos da própria galeria: a pessoa é a autora da experiência de cada uma.
  async function editPhotoDescription(photo: PhotoViewerItem, description: string) {
    const experienceId = photos?.find((item) => item.photo_id === photo.id)?.experience_id;
    if (!experienceId) return false;
    try {
      const updated = await updateExperienceDescription(experienceId, description);
      updateLocalDescription(experienceId, updated.description);
      addToast({ type: 'success', message: 'Descrição atualizada.' });
      return true;
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.status === 401) return false;
      addToast({
        type: 'error',
        message:
          apiError.kind === 'network'
            ? 'Sem conexão com a internet'
            : apiError.kind === 'timeout'
              ? 'A conexão demorou demais'
              : 'Não foi possível salvar a descrição. Tente de novo.',
      });
      return false;
    }
  }

  function openEditProfile() {
    router.push({ pathname: '/EditProfile', params: user ? { userId: user.userId } : {} });
  }

  useTopAppBar({
    variant: 'Profile',
    // Numa conta de estabelecimento o título é o nome do estabelecimento.
    // O do perfil recarrega no foco; o do `/users/me` só vale até ele chegar.
    title: user?.userType === 'BUSINESS' ? businessName || user.name || 'Meu perfil' : 'Meu perfil',
    // Raiz de aba: não veio de lugar nenhum, então não tem voltar.
    showBack: false,
  });

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

  const retryPhotos = useCallback(() => {
    feedbackKey.current = null;
    void reloadPhotos();
  }, [reloadPhotos]);

  // O toast guarda o `retryFailed` de quando apareceu: o que falhou é lido no
  // toque, e só isso recarrega.
  const failed = useRef({ profile: false, events: false, photos: false });
  useEffect(() => {
    failed.current = { profile: profileError !== null, events: eventsError !== null, photos: photosError !== null };
  }, [eventsError, photosError, profileError]);

  const retryFailed = useCallback(() => {
    feedbackKey.current = null;
    if (failed.current.profile) void reloadProfile();
    if (failed.current.events) void reloadEvents();
    if (failed.current.photos) void reloadPhotos();
  }, [reloadEvents, reloadPhotos, reloadProfile]);

  const reloadFailure =
    profile && profileError
      ? profileError
      : profile && eventTabs && eventsError
        ? eventsError
        : profile && photos && photosError
          ? photosError
          : null;

  // As recargas de eventos e fotos limpam o erro ao começar; só uma resposta
  // sem erro libera um novo aviso.
  useEffect(() => {
    if (!profileError && !eventsError && !photosError && !isLoadingEvents && !isLoadingPhotos) {
      feedbackKey.current = null;
    }
  }, [eventsError, isLoadingEvents, isLoadingPhotos, photosError, profileError]);

  useEffect(() => {
    if (!reloadFailure || feedbackKey.current === reloadFailure.kind) return;
    feedbackKey.current = reloadFailure.kind;

    if (reloadFailure.kind === 'timeout' || reloadFailure.kind === 'server') {
      addToast({ type: 'error', message: reloadFailure.message, actionLabel: 'Tentar de novo', onAction: retryFailed });
    } else if (!isOffline) {
      addToast({ type: 'error', message: reloadFailure.message });
    }
  }, [addToast, isOffline, reloadFailure, retryFailed]);

  // O "Sair da conta" do dia a dia fica no Editar perfil (frame 2221:28020).
  // Aqui ele só aparece quando o perfil não carrega: sem o perfil, não há como
  // chegar ao Editar perfil.
  const logoutButton = (
    <Button
      label="Sair da conta"
      variant="Secondary"
      onPress={handleLogout}
      isLoading={isLoggingOut}
      style={styles.fullWidth}
    />
  );

  if (!user) {
    return userError ? (
      <LoadErrorState error={userError} onRetry={refetchUser} logoutButton={logoutButton} offline={isOffline} />
    ) : (
      <ProfileSkeleton offline={isOffline} />
    );
  }

  if (user.userType === 'PERSONAL') {
    if (!profile || !counts) {
      return profileError ? (
        <LoadErrorState error={profileError} onRetry={retryProfile} logoutButton={logoutButton} offline={isOffline} />
      ) : (
        <ProfileSkeleton offline={isOffline} />
      );
    }

    // `created` só existe no backend com o contador de criados: sem ele, o
    // número não aparece em vez de virar `NaN`.
    const eventsCount = typeof counts.created === 'number' ? counts.created : null;
    const activeEventsTab: UserEventsTab = ownTab === 'history' ? 'history' : eventsSubTab;
    const activeEvents = eventTabs ? eventTabs[activeEventsTab] : null;

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}>
          <ProfileHeader
            photoUrl={profile.photo_url}
            avatarVariant="User"
            stats={[
              {
                value: profile.connections_count,
                label: profile.connections_count === 1 ? 'Conexão' : 'Conexões',
                onPress: () => router.push('/Connections'),
                accessibilityLabel: `${profile.connections_count} ${
                  profile.connections_count === 1 ? 'Conexão' : 'Conexões'
                }, ver conexões`,
              },
              ...(eventsCount === null
                ? []
                : [{ value: eventsCount, label: eventsCount === 1 ? 'Evento' : 'Eventos' }]),
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
            <ProfileTabs
              items={OWN_PROFILE_TABS}
              value={ownTab}
              onChange={selectOwnTab}
              accessibilityLabel="Seções do perfil"
            />
          </View>
          {ownTab === 'events' && (
            <View style={styles.tabsWrap}>
              <ProfileTabs
                items={OWN_EVENTS_SUBTABS}
                value={eventsSubTab}
                onChange={setEventsSubTab}
                variant="listHeader"
                accessibilityLabel="Tipos de evento"
              />
            </View>
          )}

          {ownTab === 'gallery' ? (
            <ProfilePhotoGrid
              photos={photos}
              loadFailed={photosError !== null}
              onRetry={retryPhotos}
              total={counts.photos}
              empty={EMPTY_GALLERY}
              hasMore={hasMorePhotos}
              isLoadingMore={isLoadingMorePhotos}
              onLoadMore={handleLoadMorePhotos}
              loadMoreButtonRef={loadMorePhotosButtonRef}
              onPressPhoto={(_, index) => setViewerIndex(index)}
            />
          ) : (
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
          )}

        </ScrollView>
        {isOffline && <OfflineBanner />}
        <PhotoViewer
          initialIndex={viewerIndex}
          photos={toPhotoViewerItems(photos ?? [], { canDelete: !isOffline, canEditDescription: !isOffline })}
          onClose={closeViewer}
          onDelete={deletePhoto}
          onEditDescription={editPhotoDescription}
          onPressTitle={(photo) => {
            const eventId = photos?.find((item) => item.photo_id === photo.id)?.event.id;
            if (!eventId) return;
            closeViewer();
            router.push({ pathname: '/EventDetail', params: { id: eventId } });
          }}
        />
      </View>
    );
  }

  if (user.userType === 'BUSINESS') {
    return (
      <BusinessOwnProfile
        userId={user.userId}
        isOffline={isOffline}
        logoutButton={logoutButton}
        onEditProfile={openEditProfile}
        onNameChange={setBusinessName}
      />
    );
  }

  // Um tipo de conta novo precisa do seu perfil aqui: sem ele, isto não compila.
  const _exhaustive: never = user.userType;
  return _exhaustive;
}

/**
 * Perfil comercial próprio. Os hooks só montam para a conta de estabelecimento:
 * o cabeçalho vem do perfil público (`name` e `description` são os comerciais)
 * e, como os eventos, recarrega no foco.
 */
function BusinessOwnProfile({
  userId,
  isOffline,
  logoutButton,
  onEditProfile,
  onNameChange,
}: {
  userId: string;
  isOffline: boolean;
  logoutButton: ReactNode;
  onEditProfile: () => void;
  onNameChange: (name: string | null) => void;
}) {
  const { profile, isLoading: isLoadingProfile, error: profileError, reload: reloadProfile } = useUserProfile(userId);
  const {
    tabs: eventTabs,
    isLoading: isLoadingEvents,
    error: eventsError,
    reload: reloadEvents,
    loadMore,
  } = useUserEvents(userId, { reloadOnFocus: true });
  const { loadMoreButtonRef, handleLoadMore } = useProfileEventsLoadMore({ tabs: eventTabs, loadMore, isOffline });
  const { addToast } = useToast();

  const name = profile?.name?.trim() || null;
  useEffect(() => {
    onNameChange(name);
    return () => onNameChange(null);
  }, [name, onNameChange]);

  // Mesmo aviso de recarga do perfil pessoal, com duas fontes em vez de três.
  const feedbackKey = useRef<string | null>(null);

  const retryProfile = useCallback(() => {
    feedbackKey.current = null;
    void reloadProfile();
  }, [reloadProfile]);

  const retryEvents = useCallback(() => {
    feedbackKey.current = null;
    void reloadEvents();
  }, [reloadEvents]);

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

  // As duas recargas limpam o erro ao começar; só uma resposta sem erro libera
  // um novo aviso.
  useEffect(() => {
    if (!profileError && !eventsError && !isLoadingProfile && !isLoadingEvents) {
      feedbackKey.current = null;
    }
  }, [eventsError, isLoadingEvents, isLoadingProfile, profileError]);

  useEffect(() => {
    if (!reloadFailure || feedbackKey.current === reloadFailure.kind) return;
    feedbackKey.current = reloadFailure.kind;

    if (reloadFailure.kind === 'timeout' || reloadFailure.kind === 'server') {
      addToast({ type: 'error', message: reloadFailure.message, actionLabel: 'Tentar de novo', onAction: retryFailed });
    } else if (!isOffline) {
      addToast({ type: 'error', message: reloadFailure.message });
    }
  }, [addToast, isOffline, reloadFailure, retryFailed]);

  if (!profile) {
    return profileError ? (
      <LoadErrorState error={profileError} onRetry={retryProfile} logoutButton={logoutButton} offline={isOffline} />
    ) : (
      <ProfileSkeleton offline={isOffline} />
    );
  }

  // Só Seguidores: Eventos e Fotos do frame não têm fonte.
  // `connections_count` até a task 281 [BE] trazer o `followers_count`.
  const followers = profile.followers_count ?? profile.connections_count;
  const createdEvents = eventTabs ? eventTabs.created : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}>
        <ProfileHeader
          photoUrl={profile.photo_url}
          avatarVariant="Store"
          stats={[
            {
              value: followers,
              label: followers === 1 ? 'Seguidor' : 'Seguidores',
              onPress: () => router.push('/Followers'),
              accessibilityLabel: `${followers} ${followers === 1 ? 'Seguidor' : 'Seguidores'}, ver seguidores`,
            },
          ]}
          name={name}
          description={profile.description?.trim() || null}
          tags={profile.tags}
          actions={<Button label="Editar perfil" variant="Secondary" onPress={onEditProfile} style={styles.fullWidth} />}
        />

        {/* Sem Galeria (não há rota de fotos dos eventos do estabelecimento) e
            sem Seguidores (tasks 282/283): sobra uma seção só, e o título vira
            barra de abas quando Seguidores entrar. */}
        <View style={styles.sectionTitle}>
          <SectionHeader title="Eventos" />
        </View>

        <ProfileEventList
          items={eventTabs ? (createdEvents?.items ?? []) : null}
          loadFailed={eventsError !== null}
          onRetry={retryEvents}
          empty={EMPTY_OWN_EVENTS.created}
          hasMore={createdEvents?.hasMore ?? false}
          isLoadingMore={createdEvents?.loadingMore ?? false}
          onLoadMore={() => handleLoadMore('created')}
          loadMoreButtonRef={loadMoreButtonRef}
        />

      </ScrollView>
      {isOffline && <OfflineBanner />}
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
  sectionTitle: {
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
