import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProfileEventList } from '@/components/Profile/ProfileEventList';
import { ProfileEventListSkeleton } from '@/components/Profile/ProfileEventListSkeleton';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { ProfileHeaderSkeleton } from '@/components/Profile/ProfileHeaderSkeleton';
import { ProfileTabs } from '@/components/ProfileTabs';
import { RelationshipButton } from '@/components/RelationshipButton';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useBusinessFollow } from '@/hooks/useBusinessFollow';
import { useConnections } from '@/hooks/useConnections';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useProfileEventsLoadMore } from '@/hooks/useProfileEventsLoadMore';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUserEvents } from '@/hooks/useUserEvents';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { ProfilePatch } from '@/hooks/useUserProfile';
import type { UserEventsTab, UserProfile as UserProfileData } from '@/types/user';

/**
 * Espera o fade de saída do `Modal` antes de mover o foco do leitor de tela:
 * com o diálogo ainda saindo, o VoiceOver ignora o novo foco.
 */
const MODAL_FADE_OUT_MS = 350;

function displayName(profile: UserProfileData | null) {
  return profile?.name?.trim() || null;
}

function firstName(name: string | null) {
  return name ? name.split(/\s+/)[0] : null;
}

/** Diálogos de confirmação do botão de relacionamento: um aberto por vez. */
type RelationshipDialog = 'unfollow' | 'cancel' | 'undo';

/** Seguidores do estabelecimento: `connections_count` até a task 281 [BE] trazer o `followers_count`. */
function followersOf(profile: UserProfileData) {
  return profile.followers_count ?? profile.connections_count;
}

/** Muda os seguidores no mesmo campo de onde `followersOf` lê. */
function followersPatch(profile: UserProfileData, delta: number): ProfilePatch {
  return typeof profile.followers_count === 'number'
    ? { followers_count: profile.followers_count + delta }
    : { connections_count: profile.connections_count + delta };
}

type PersonEventsTab = Extract<UserEventsTab, 'history' | 'created'>;

const PERSON_EVENTS_TABS = [
  { value: 'history', label: 'Histórico' },
  { value: 'created', label: 'Eventos' },
] as const satisfies ReadonlyArray<{ value: PersonEventsTab; label: string }>;

const EMPTY_EVENTS: Record<PersonEventsTab, { title: string; text: string }> = {
  history: { title: 'Nenhum evento no histórico', text: 'Os eventos que já aconteceram aparecem aqui.' },
  created: { title: 'Nenhum evento por aqui', text: 'Quando este perfil tiver eventos, eles aparecem aqui.' },
};

function visibilityNotice(profileName: string | null, isBusiness: boolean) {
  if (isBusiness) {
    return profileName
      ? `Você vê apenas os eventos públicos de ${profileName}.`
      : 'Você vê apenas os eventos públicos deste estabelecimento.';
  }
  return profileName
    ? `Você vê apenas os eventos públicos que ${firstName(profileName)} criou.`
    : 'Você vê apenas os eventos públicos criados por este perfil.';
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Home');
}

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Em paralelo com o perfil e os eventos: a visita não espera o `/users/me`.
  const { user, isLoading: isLoadingViewer } = useCurrentUser();
  const { profile, isLoading, error, reload, patchProfile } = useUserProfile(id);
  const {
    tabs: eventTabs,
    isLoading: isLoadingEvents,
    error: eventsError,
    reload: reloadEvents,
    loadMore,
  } = useUserEvents(id);
  const [personEventsTab, setPersonEventsTab] = useState<PersonEventsTab>('created');
  const { isOffline } = useNetworkStatus();
  const { loadMoreButtonRef, handleLoadMore } = useProfileEventsLoadMore({ tabs: eventTabs, loadMore, isOffline });
  const { addToast } = useToast();
  const { connect, remove: removeConnection, isLoading: isConnectionPending } = useConnections();
  const { follow, unfollow, isLoading: isFollowPending } = useBusinessFollow();
  const isRelationshipPending = isConnectionPending || isFollowPending;
  const [openDialog, setOpenDialog] = useState<RelationshipDialog | null>(null);
  const relationshipButtonRef = useRef<View>(null);
  // Ligado ao fechar o diálogo; consumido quando o botão volta a aceitar foco.
  const returnFocusPending = useRef(false);

  // Se o `GET /users/me` falhar, `user` fica nulo e a tela segue como visita.
  const isOwnProfile = user !== null && id === user.userId;
  const isUnavailable = error?.kind === 'unavailable';
  // Até saber quem está logado, o perfil não aparece: o id pode ser o próprio.
  const visibleProfile = isUnavailable || isLoadingViewer || isOwnProfile ? null : profile;
  const activeEventsTab: PersonEventsTab = visibleProfile?.user_type === 'BUSINESS' ? 'created' : personEventsTab;
  const activeEvents = eventTabs ? eventTabs[activeEventsTab] : null;
  const events = eventTabs ? (activeEvents?.items ?? []) : null;
  // Depois do `await`, o perfil capturado pelo callback é o de antes da
  // requisição; a ação confere o valor atual por aqui.
  const profileRef = useRef(visibleProfile);
  profileRef.current = visibleProfile;
  const name = displayName(visibleProfile);
  const description = visibleProfile?.description?.trim() || null;

  useTopAppBar({
    variant: 'Profile',
    title: name ?? 'Perfil',
    action: visibleProfile
      ? { icon: 'flag', accessibilityLabel: 'Denunciar perfil', disabled: true, onPress: () => {} }
      : undefined,
  });

  // Chave do último toast de falha ao recarregar. Cada volta ao foco gera um
  // erro novo, então sem a chave a mesma falha seria avisada de novo a cada
  // retorno à tela.
  const feedbackKey = useRef<string | null>(null);

  // O toast guarda o `retryFailed` de quando apareceu: o que falhou é lido no
  // toque. Recarregar os eventos sem erro descartaria as páginas do "Ver mais".
  const failed = useRef({ profile: false, events: false });
  useEffect(() => {
    failed.current = { profile: error !== null, events: eventsError !== null };
  }, [error, eventsError]);

  const retryFailed = useCallback(() => {
    feedbackKey.current = null;
    if (failed.current.profile) void reload();
    if (failed.current.events) void reloadEvents();
  }, [reload, reloadEvents]);

  const retryEvents = useCallback(() => {
    feedbackKey.current = null;
    void reloadEvents();
  }, [reloadEvents]);

  const reloadFailure =
    visibleProfile && error ? error : visibleProfile && events && eventsError ? eventsError : null;

  useEffect(() => {
    if (!reloadFailure) return;
    const key = `${id}:${reloadFailure.kind}`;
    if (feedbackKey.current === key) return;
    feedbackKey.current = key;

    if (reloadFailure.kind === 'timeout' || reloadFailure.kind === 'server') {
      addToast({ type: 'error', message: reloadFailure.message, actionLabel: 'Tentar de novo', onAction: retryFailed });
    } else if (!isOffline) {
      addToast({ type: 'error', message: reloadFailure.message });
    }
  }, [addToast, id, isOffline, reloadFailure, retryFailed]);

  useEffect(() => {
    setPersonEventsTab('created');
  }, [id]);

  useEffect(() => {
    if (!isLoading && !error && !isLoadingEvents && !eventsError) feedbackKey.current = null;
  }, [error, eventsError, isLoading, isLoadingEvents]);

  const handleConnect = useCallback(async () => {
    const target = profileRef.current;
    if (!target) return;
    const previous = patchProfile({ connection_status: 'PENDING' });
    if (!previous) return;

    const result = await connect(target.id);
    if (result.kind === 'sent') {
      // Também cobre um recarregamento no foco durante a requisição, que pode
      // ter trazido o estado de antes do pedido. Com o id, dá para cancelar
      // sem recarregar.
      patchProfile({ connection_status: 'PENDING', connection_id: result.connectionId, connection_direction: 'SENT' });
      addToast({ type: 'success', message: 'Solicitação de conexão enviada.' });
      return;
    }

    // No 409 o servidor já tem um vínculo: o recarregamento traz o estado real,
    // sem passar de volta por "Conectar".
    if (result.kind === 'conflict') {
      void reload();
      return;
    }

    patchProfile(previous);
    if (result.kind === 'unavailable') void reload();
  }, [addToast, connect, patchProfile, reload]);

  // Sem perfil na tela (ex.: virou indisponível) o diálogo fecha, para não
  // reaparecer sozinho se o perfil voltar.
  useEffect(() => {
    if (!visibleProfile) setOpenDialog(null);
  }, [visibleProfile]);

  const handleFollow = useCallback(async () => {
    const target = profileRef.current;
    if (!target) return;
    const previous = patchProfile({ is_following: true, ...followersPatch(target, 1) });
    if (!previous) return;

    const result = await follow(target.id);
    if (result === 'done') {
      const current = profileRef.current;
      if (current && !current.is_following) {
        patchProfile({ is_following: true, ...followersPatch(current, 1) });
      }
      const businessName = displayName(profileRef.current ?? target);
      addToast({
        type: 'success',
        message: businessName ? `Agora você segue ${businessName}.` : 'Agora você segue este estabelecimento.',
      });
      return;
    }

    patchProfile(previous);
    if (result === 'unavailable') void reload();
  }, [addToast, follow, patchProfile, reload]);

  const closeDialog = useCallback(() => {
    returnFocusPending.current = true;
    setOpenDialog(null);
  }, []);

  // Com o botão ocupado (confirmando) ele não aceita foco: a devolução espera
  // a requisição terminar.
  useEffect(() => {
    if (openDialog || isRelationshipPending || !returnFocusPending.current) return;

    if (Platform.OS === 'web') {
      returnFocusPending.current = false;
      // Ao cancelar, o `Modal` da Web já devolve o foco; ao confirmar, o botão
      // estava desabilitado e o foco caiu no `body`.
      if (typeof document !== 'undefined' && document.activeElement === document.body) {
        relationshipButtonRef.current?.focus();
      }
      return;
    }

    const timer = setTimeout(() => {
      returnFocusPending.current = false;
      const button = relationshipButtonRef.current;
      if (button) AccessibilityInfo.sendAccessibilityEvent(button, 'focus');
    }, MODAL_FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [isRelationshipPending, openDialog]);

  const handleUnfollow = useCallback(async () => {
    closeDialog();
    const target = profileRef.current;
    if (!target) return;
    const previous = patchProfile({ is_following: false, ...followersPatch(target, -1) });
    if (!previous) return;

    const result = await unfollow(target.id);
    if (result === 'done') {
      const current = profileRef.current;
      if (current && current.is_following) {
        patchProfile({ is_following: false, ...followersPatch(current, -1) });
      }
      return;
    }

    patchProfile(previous);
    if (result === 'unavailable') void reload();
  }, [closeDialog, patchProfile, reload, unfollow]);

  // A conexão mudou do outro lado (respondida, cancelada ou desfeita): o
  // recarregamento traz o estado real, sem voltar ao de antes do toque.
  const reloadAfterStaleConnection = useCallback(() => {
    void reload();
    addToast({ type: 'info', message: 'Essa conexão mudou. O perfil foi atualizado.' });
  }, [addToast, reload]);

  // Cancelar a solicitação enviada e desfazer a conexão são o mesmo `DELETE`.
  const handleRemoveConnection = useCallback(async () => {
    closeDialog();
    const target = profileRef.current;
    const connectionId = target?.connection_id;
    if (!target || !connectionId) return;
    const wasConnected = target.connection_status === 'CONFIRMED';
    const removed = (profile: UserProfileData): ProfilePatch => ({
      connection_status: null,
      connection_id: null,
      connection_direction: null,
      ...(wasConnected && { connections_count: profile.connections_count - 1 }),
    });
    const previous = patchProfile(removed(target));
    if (!previous) return;

    const result = await removeConnection(connectionId);
    // No `gone` a conexão já não existia: o que a pessoa pediu já vale.
    if (result === 'done' || result === 'gone') {
      const current = profileRef.current;
      if (current && current.connection_id === connectionId) patchProfile(removed(current));
      addToast({ type: 'success', message: wasConnected ? 'Conexão desfeita.' : 'Solicitação cancelada.' });
      return;
    }

    if (result === 'stale') {
      reloadAfterStaleConnection();
      return;
    }

    patchProfile(previous);
  }, [addToast, closeDialog, patchProfile, reloadAfterStaleConnection, removeConnection]);

  if (isOwnProfile) return <Redirect href="/Profile" />;

  // O erro também espera quem está logado: com o id próprio, a tela vira o
  // redirect, não o erro.
  if (isUnavailable && !isLoadingViewer) {
    return (
      <View style={styles.stateScreen}>
        <EmptyState
          context="Search"
          title={error?.title ?? 'Perfil indisponível'}
          text={error?.message ?? 'Este perfil não está disponível.'}
          cta
          ctaLabel="Voltar"
          onCtaPress={goBack}
        />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  if (!visibleProfile) {
    if (error && !isLoadingViewer) {
      return (
        <View style={styles.stateScreen}>
          <EmptyState
            context="Search"
            title={error.title}
            text={error.message}
            cta
            ctaLabel="Tentar de novo"
            onCtaPress={retryFailed}
          />
          {isOffline && <OfflineBanner />}
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <UserProfileSkeleton offline={isOffline} />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  const isBusiness = visibleProfile.user_type === 'BUSINESS';
  const { connection_status: connectionStatus, connection_id: connectionId } = visibleProfile;
  // Sem `connection_id` (backend de antes da task 281 [BE]), "Solicitação
  // enviada" e "Conectados" continuam sem ação.
  const personAction =
    connectionStatus === null
      ? handleConnect
      : connectionStatus === 'PENDING' && visibleProfile.connection_direction === 'SENT' && connectionId
        ? () => setOpenDialog('cancel')
        : connectionStatus === 'CONFIRMED' && connectionId
          ? () => setOpenDialog('undo')
          : undefined;
  const relationshipAction = isBusiness
    ? visibleProfile.is_following
      ? () => setOpenDialog('unfollow')
      : handleFollow
    : personAction;
  // Com ação, o nome diz o que o toque faz; começa pelo rótulo visível (WCAG 2.5.3).
  const relationshipLabel =
    !isBusiness && personAction && connectionStatus === 'PENDING'
      ? 'Solicitação enviada, cancelar solicitação'
      : !isBusiness && personAction && connectionStatus === 'CONFIRMED'
        ? 'Conectados, desfazer conexão'
        : undefined;
  const personFirstName = firstName(name);
  const count = isBusiness ? followersOf(visibleProfile) : visibleProfile.connections_count;
  const singular = count === 1;
  const stats = [
    {
      value: count,
      label: isBusiness ? (singular ? 'Seguidor' : 'Seguidores') : singular ? 'Conexão' : 'Conexões',
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}>
        <ProfileHeader
          photoUrl={visibleProfile.photo_url}
          avatarVariant={isBusiness ? 'Store' : 'User'}
          stats={stats}
          name={name}
          description={description}
          tags={visibleProfile.tags}
          actions={
            // Sem ação na recusa: o vínculo recusado continua ativo no backend e um novo pedido daria 409.
            visibleProfile.connection_status !== 'REJECTED' ? (
              <RelationshipButton
                ref={relationshipButtonRef}
                userType={visibleProfile.user_type}
                connectionStatus={visibleProfile.connection_status}
                isFollowing={visibleProfile.is_following}
                onPress={relationshipAction}
                accessibilityLabel={relationshipLabel}
                disabled={isOffline}
                isLoading={isRelationshipPending}
                style={styles.relationshipButton}
              />
            ) : null
          }
        />

        {isBusiness ? (
          <View style={styles.sectionTitle}>
            <SectionHeader title="Eventos" />
          </View>
        ) : (
          <View style={styles.tabsWrap}>
            <ProfileTabs
              items={PERSON_EVENTS_TABS}
              value={personEventsTab}
              onChange={setPersonEventsTab}
              accessibilityLabel="Seções do perfil"
            />
          </View>
        )}

        {activeEventsTab === 'created' && (
          <Text style={styles.visibilityNotice}>{visibilityNotice(name, isBusiness)}</Text>
        )}

        <ProfileEventList
          items={events}
          loadFailed={eventsError !== null}
          onRetry={retryEvents}
          empty={EMPTY_EVENTS[activeEventsTab]}
          hasMore={activeEvents?.hasMore ?? false}
          isLoadingMore={activeEvents?.loadingMore ?? false}
          onLoadMore={() => handleLoadMore(activeEventsTab)}
          loadMoreButtonRef={loadMoreButtonRef}
        />
      </ScrollView>

      <Dialog
        visible={openDialog === 'unfollow'}
        variant="SendRequest"
        title={name ? `Deixar de seguir ${name}?` : 'Deixar de seguir este estabelecimento?'}
        description="Você pode voltar a seguir quando quiser."
        confirmLabel="Deixar de seguir"
        onConfirm={() => void handleUnfollow()}
        onCancel={closeDialog}
      />

      <Dialog
        visible={openDialog === 'cancel'}
        variant="SendRequest"
        title={
          personFirstName
            ? `Cancelar a solicitação para ${personFirstName}?`
            : 'Cancelar a solicitação de conexão?'
        }
        description={
          personFirstName
            ? `A solicitação de conexão para ${personFirstName} será cancelada. Você pode enviar outra depois.`
            : 'A solicitação de conexão será cancelada. Você pode enviar outra depois.'
        }
        confirmLabel="Cancelar solicitação"
        onConfirm={() => void handleRemoveConnection()}
        onCancel={closeDialog}
      />

      {/* Destrutivo: o `LeaveEvent` só empresta a aparência. */}
      <Dialog
        visible={openDialog === 'undo'}
        variant="LeaveEvent"
        title={personFirstName ? `Desfazer a conexão com ${personFirstName}?` : 'Desfazer a conexão?'}
        description="Vocês deixam de estar conectados e a outra pessoa não é avisada. Para se conectar de novo, um de vocês precisa enviar uma nova solicitação."
        confirmLabel="Desfazer conexão"
        cancelLabel="Cancelar"
        onConfirm={() => void handleRemoveConnection()}
        onCancel={closeDialog}
      />

      {isOffline && <OfflineBanner />}
    </View>
  );
}

function UserProfileSkeleton({ offline }: { offline: boolean }) {
  return (
    <View
      style={[styles.content, offline && styles.contentOffline]}
      accessible
      accessibilityLabel="Carregando perfil"
      accessibilityRole="progressbar"
    >
      <ProfileHeaderSkeleton />
      <ProfileEventListSkeleton />
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
  // Mesmo respiro de `Notifications`: o `OfflineBanner` é absoluto e cobriria o topo.
  contentOffline: {
    paddingTop: spacing[64],
  },
  relationshipButton: {
    alignSelf: 'stretch',
  },
  // O `ProfileTabs` ocupa 100% do contêiner: a margem lateral vem de fora,
  // como o "TabsWrap" dos frames.
  tabsWrap: {
    paddingHorizontal: spacing[16],
  },
  sectionTitle: {
    paddingHorizontal: spacing[16],
  },
  visibilityNotice: {
    ...typography.bodyS,
    color: colors.text.secondary,
    paddingTop: spacing[4],
    paddingHorizontal: spacing[16],
  },
});
