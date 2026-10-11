import { Fragment, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { OfflineBanner } from '@/components/OfflineBanner';
import { RelationshipButton } from '@/components/RelationshipButton';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useConnections } from '@/hooks/useConnections';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUserEvents } from '@/hooks/useUserEvents';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { UserEventItem } from '@/types/user';

/** Avatar `MD` do código, que é o `XL` (80) do frame. */
const AVATAR_DIAMETER = 80;
/** Divisor vertical entre os números do cabeçalho, 1 × 28 no frame. */
const STAT_DIVIDER_HEIGHT = 28;
const SKELETON_CARD_COUNT = 3;

function toEventCardEvent(item: UserEventItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
  };
}

const countFormatter = new Intl.NumberFormat('pt-BR');

function formatCount(value: number) {
  return countFormatter.format(value);
}

function visibilityNotice(profileName: string | null, isBusiness: boolean) {
  if (!profileName) return 'Você vê apenas os eventos públicos deste perfil.';
  const owner = isBusiness ? profileName : profileName.split(/\s+/)[0];
  return `Você vê apenas os eventos públicos de ${owner}.`;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Home');
}

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, isLoading, error, reload, patchProfile } = useUserProfile(id);
  const {
    events,
    isLoading: isLoadingEvents,
    error: eventsError,
    reload: reloadEvents,
  } = useUserEvents(id);
  const { isOffline } = useNetworkStatus();
  const { addToast } = useToast();
  const { connect, isLoading: isConnecting } = useConnections();

  const isUnavailable = error?.kind === 'unavailable';
  const visibleProfile = isUnavailable ? null : profile;
  // Depois do `await`, o perfil capturado pelo callback é o de antes da
  // requisição; a ação confere o valor atual por aqui.
  const profileRef = useRef(visibleProfile);
  profileRef.current = visibleProfile;
  const name = visibleProfile?.name?.trim() || null;
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

  const retryAll = useCallback(() => {
    feedbackKey.current = null;
    void reload();
    void reloadEvents();
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
      addToast({ type: 'error', message: reloadFailure.message, actionLabel: 'Tentar de novo', onAction: retryAll });
    } else if (!isOffline) {
      addToast({ type: 'error', message: reloadFailure.message });
    }
  }, [addToast, id, isOffline, reloadFailure, retryAll]);

  useEffect(() => {
    if (!isLoading && !error && !isLoadingEvents && !eventsError) feedbackKey.current = null;
  }, [error, eventsError, isLoading, isLoadingEvents]);

  const handleConnect = useCallback(async () => {
    const target = profileRef.current;
    if (!target) return;
    const previous = patchProfile({ connection_status: 'PENDING' });
    if (!previous) return;

    const result = await connect(target.id);
    if (result === 'sent') {
      // Um recarregamento no foco durante a requisição pode ter trazido o
      // estado de antes do pedido.
      if (profileRef.current?.connection_status !== 'PENDING') {
        patchProfile({ connection_status: 'PENDING' });
      }
      addToast({ type: 'success', message: 'Solicitação de conexão enviada.' });
      return;
    }

    // No 409 o servidor já tem um vínculo: o recarregamento traz o estado real,
    // sem passar de volta por "Conectar".
    if (result === 'conflict') {
      void reload();
      return;
    }

    patchProfile(previous);
    if (result === 'unavailable') void reload();
  }, [addToast, connect, patchProfile, reload]);

  if (isUnavailable) {
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
    if (error) {
      return (
        <View style={styles.stateScreen}>
          <EmptyState
            context="Search"
            title={error.title}
            text={error.message}
            cta
            ctaLabel="Tentar de novo"
            onCtaPress={retryAll}
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
  const avatarSource = visibleProfile.photo_url ? { uri: visibleProfile.photo_url } : undefined;
  const canConnect = !isBusiness && visibleProfile.connection_status === null;
  const count = visibleProfile.connections_count;
  const singular = count === 1;
  const stats = [
    {
      value: formatCount(count),
      label: isBusiness ? (singular ? 'Seguidor' : 'Seguidores') : singular ? 'Conexão' : 'Conexões',
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, isOffline && styles.contentOffline]}>
        <View style={styles.header}>
          <View style={styles.top}>
            {/* Decorativo: o nome vem logo abaixo e o leitor de tela não precisa anunciar a foto. */}
            {isBusiness ? (
              <Avatar variant="Store" size="MD" source={avatarSource} />
            ) : (
              <Avatar size="MD" source={avatarSource} />
            )}

            {stats.length > 0 && (
              <View style={styles.stats}>
                {stats.map((stat, index) => (
                  <Fragment key={stat.label}>
                    {index > 0 && <View style={styles.statDivider} />}
                    <View style={styles.stat} accessible accessibilityLabel={`${stat.value} ${stat.label}`}>
                      <Text style={styles.statValue}>{stat.value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  </Fragment>
                ))}
              </View>
            )}
          </View>

          {(name || description) && (
            <View style={styles.identity}>
              {name && (
                <Text style={styles.name} accessibilityRole="header">
                  {name}
                </Text>
              )}
              {description && <Text style={styles.description}>{description}</Text>}
            </View>
          )}

          {visibleProfile.tags.length > 0 && (
            // O `Chip` é sempre um botão. As tags aqui não são tocáveis, então o
            // grupo vira um único elemento para o leitor de tela e não recebe toque.
            <View
              style={styles.tags}
              accessible
              accessibilityLabel={`Interesses: ${visibleProfile.tags.map((tag) => tag.name).join(', ')}`}
            >
              {visibleProfile.tags.map((tag) => (
                <Chip key={tag.id} label={tag.name} size="sm" categoryType="macro" isSelected />
              ))}
            </View>
          )}

          {/* Sem ação na recusa: o vínculo recusado continua ativo no backend e um novo pedido daria 409. */}
          {visibleProfile.connection_status !== 'REJECTED' && (
            <View style={styles.actions}>
              <RelationshipButton
                userType={visibleProfile.user_type}
                connectionStatus={visibleProfile.connection_status}
                isFollowing={visibleProfile.is_following}
                onPress={canConnect ? handleConnect : undefined}
                disabled={isOffline}
                isLoading={isConnecting}
                style={styles.relationshipButton}
              />
            </View>
          )}
        </View>

        <Text style={styles.visibilityNotice}>{visibilityNotice(name, isBusiness)}</Text>

        <View style={styles.list}>
          {events === null ? (
            eventsError ? (
              <View style={styles.sectionError}>
                <SectionEmptyState
                  icon="circle-alert"
                  title="Não foi possível carregar os eventos"
                  text="Tente de novo."
                />
                <Button label="Tentar de novo" variant="Tertiary" size="MD" onPress={retryEvents} />
              </View>
            ) : (
              <EventsSkeleton />
            )
          ) : events.length === 0 ? (
            <SectionEmptyState
              icon="calendar-x"
              title="Nenhum evento por aqui"
              text="Quando este perfil tiver eventos, eles aparecem aqui."
            />
          ) : (
            events.map((item) => (
              <EventCard
                key={item.event_id}
                variant="Compact"
                event={toEventCardEvent(item)}
                onPress={() => router.push(`/EventDetail?id=${item.event_id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {isOffline && <OfflineBanner />}
    </View>
  );
}

function EventsSkeleton() {
  return (
    <View
      style={styles.skeletonList}
      accessible
      accessibilityLabel="Carregando eventos"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <View key={index} style={[styles.skeletonBlock, styles.skeletonCard]} />
      ))}
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
      <View style={styles.header}>
        <View style={styles.top}>
          <View style={[styles.skeletonBlock, styles.skeletonAvatar]} />
        </View>
        <View style={styles.identity}>
          <View style={[styles.skeletonBlock, styles.skeletonName]} />
          <View style={[styles.skeletonBlock, styles.skeletonDescription]} />
        </View>
      </View>
      <View style={styles.list}>
        <EventsSkeleton />
      </View>
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
  header: {
    gap: spacing[12],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[20],
    paddingHorizontal: spacing[16],
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    gap: spacing[4],
  },
  statValue: {
    ...typography.h4,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: STAT_DIVIDER_HEIGHT,
    backgroundColor: colors.border.default,
  },
  identity: {
    gap: spacing[4],
    paddingHorizontal: spacing[16],
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    pointerEvents: 'none',
  },
  actions: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[16],
  },
  relationshipButton: {
    alignSelf: 'stretch',
  },
  visibilityNotice: {
    ...typography.bodyS,
    color: colors.text.secondary,
    paddingTop: spacing[4],
    paddingHorizontal: spacing[16],
  },
  list: {
    gap: spacing[12],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[16],
  },
  sectionError: {
    gap: spacing[12],
  },
  skeletonList: {
    gap: spacing[12],
  },
  skeletonBlock: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  skeletonAvatar: {
    width: AVATAR_DIAMETER,
    height: AVATAR_DIAMETER,
    borderRadius: radius.full,
  },
  skeletonName: {
    width: '60%',
    height: typography.h3.lineHeight,
  },
  skeletonDescription: {
    width: '90%',
    height: typography.bodyS.lineHeight,
  },
  skeletonCard: {
    height: layout.eventCard.compactHeight,
    borderRadius: radius.md,
  },
});
