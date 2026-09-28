import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useToast } from '@/components/Toast';
import { Badge } from '@/components/Badge';
import { PhotoTile } from '@/components/PhotoTile';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useEvent } from '@/hooks/useEvent';
import { useEventShare } from '@/hooks/useEventShare';
import { useInviteAccept, type InviteAcceptError } from '@/hooks/useInviteAccept';
import { useParticipation, type ParticipationError } from '@/hooks/useParticipation';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { ViewerAction } from '@/types/event';
import { formatDateTime } from '@/utils/datetime';
import { getToken } from '@/utils/auth';

/**
 * Detalhe do evento — frame `Evento - visão do organizador` do Figma.
 *
 * É **uma** tela com blocos condicionais, não quatro telas parecidas: o que
 * muda entre organizador, confirmado, visitante de evento público e visitante
 * de evento privado é quais blocos aparecem e qual é a ação do rodapé.
 */

/** Altura da capa — `PhotoTile/Cover` no Figma. */
const HERO_HEIGHT = 237;
/** Altura do degradê que escurece o pé da capa para o título ficar legível. */
const SCRIM_HEIGHT = 150;
/** Opacidade do degradê no ponto mais escuro, sobre `color/bg/inverse`. */
const SCRIM_OPACITY = 0.82;

/**
 * Ação principal do rodapé. Vem pronta de `viewer.available_action` — a tela
 * não deduz nada de `privacy` + `participation_status`, só consulta a tabela.
 */
const MAIN_ACTION: Record<
  ViewerAction,
  { label: string; variant: 'Primary' | 'Danger'; icon?: 'share' | 'settings' } | null
> = {
  CONFIRM: { label: 'Confirmar presença', variant: 'Primary' },
  REQUEST: { label: 'Solicitar participação', variant: 'Primary' },
  CANCEL: { label: 'Cancelar presença', variant: 'Danger' },
  SHARE: { label: 'Compartilhar link', variant: 'Primary', icon: 'share' },
  MANAGE: { label: 'Gerenciar evento', variant: 'Primary', icon: 'settings' },
  NONE: null,
};

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token: inviteToken } = useLocalSearchParams<{ token?: string }>();
  const [resolvedEventId, setResolvedEventId] = useState<string | undefined>(id);
  const [inviteStage, setInviteStage] = useState<'idle' | 'accepting' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<{ title: string; message: string } | null>(null);
  const { accept } = useInviteAccept();

  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { event, isLoading, error, reload } = useEvent(resolvedEventId);
  const { share, isLoading: isSharing } = useEventShare(resolvedEventId);
  const { join, cancel, isSubmitting } = useParticipation(event?.event_id ?? resolvedEventId ?? '');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Sem barra superior: os botões desta tela ficam por cima da capa, e uma
  // TopAppBar em cima disso viraria uma segunda linha de ações.
  useTopAppBar(null);

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;

    async function resolveInvite() {
      const sessionToken = await getToken();

      if (!sessionToken) {
        await AsyncStorage.setItem('@hangy:pendingInviteToken', inviteToken as string);
        router.replace('/Login');
        return;
      }

      setInviteStage('accepting');
      try {
        const result = await accept(inviteToken as string);
        if (cancelled) return;
        setResolvedEventId(result.event_id);
        setInviteStage('idle');
      } catch (err) {
        if (cancelled) return;
        const apiError = err as InviteAcceptError;
        if (apiError.status === 410) {
          setInviteError({ title: 'Este convite expirou', message: 'Peça um novo link pra quem te convidou.' });
        } else if (apiError.status === 403) {
          addToast({ type: 'error', message: 'Este link de convite não é válido' });
          router.replace('/Home');
          return;
        } else {
          setInviteError({ title: 'Não foi possível confirmar', message: 'Tente abrir o link de novo.' });
        }
        setInviteStage('error');
      }
    }

    resolveInvite();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  if (inviteToken && inviteStage === 'accepting') {
    return (
      <View style={styles.errorScreen}>
        <EmptyState context="MyEvents" title="Confirmando sua participação..." text="Só um instante." cta={false} />
      </View>
    );
  }

  if (inviteToken && inviteStage === 'error' && inviteError) {
    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title={inviteError.title}
          text={inviteError.message}
          cta
          ctaLabel="Voltar para o início"
          onCtaPress={() => router.replace('/Home')}
        />
      </View>
    );
  }

  if (isLoading) return <EventDetailSkeleton />;

  if (error || !event) {
    const failure = error ?? {
      title: 'Evento indisponível',
      message: 'Evento não encontrado ou não disponível para você',
      canRetry: false,
    };

    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title={failure.title}
          text={failure.message}
          cta
          ctaLabel={failure.canRetry ? 'Tentar de novo' : 'Voltar'}
          onCtaPress={failure.canRetry ? reload : router.back}
        />
      </View>
    );
  }

  const action = MAIN_ACTION[event.viewer.available_action] ?? null;
  const preview = event.participants_preview;
  const pendingCount = event.pending_requests_count ?? 0;
  // Só o organizador vê o aviso, e só quando há alguém esperando.
  const showPendingBanner = event.viewer.is_organizer && pendingCount > 0;
  const [descriptionLead, ...descriptionRest] = event.description.split('\n');

  const isPendingCancel = event.viewer.participation_status === 'PENDING';
  const participationStatusBadge =
    event.viewer.participation_status === 'CONFIRMED' ||
    event.viewer.participation_status === 'PENDING' ||
    event.viewer.participation_status === 'REJECTED'
      ? event.viewer.participation_status
      : undefined;

  async function handleJoin() {
    try {
      await join();
      reload();
    } catch (err) {
      const apiError = err as ParticipationError;
      if (apiError.status === 409) {
        addToast({ type: 'warning', message: 'Este evento está lotado' });
      } else {
        addToast({ type: 'error', message: 'Não foi possível concluir. Tente de novo.' });
      }
      reload();
    }
  }

  async function handleCancelConfirm() {
    setShowCancelDialog(false);
    try {
      await cancel();
      addToast({ type: 'success', message: 'Participação cancelada.' });
      reload();
    } catch {
      addToast({ type: 'error', message: 'Não foi possível cancelar. Tente de novo.' });
    }
  }

  function onMainAction() {
    if (event!.viewer.available_action === 'SHARE') {
      share();
      return;
    }

    if (event!.viewer.available_action === 'MANAGE') {
      router.push(`/ManageEvent?id=${event!.event_id}`);
      return;
    }

    if (event!.viewer.available_action === 'CANCEL') {
      setShowCancelDialog(true);
      return;
    }

    handleJoin();
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[24] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <PhotoTile
            state="Cover"
            uri={event.cover_photo_url ?? undefined}
            accessibilityLabel="Capa do evento"
          />

          {/* Degradê em SVG: o app não tem expo-linear-gradient, e
              react-native-svg já é dependência (o FileUpload usa). */}
          <Svg style={styles.scrim} width="100%" height={SCRIM_HEIGHT}>
            <Defs>
              <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bg.inverse} stopOpacity={0} />
                <Stop offset="1" stopColor={colors.bg.inverse} stopOpacity={SCRIM_OPACITY} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
          </Svg>

          <View style={[styles.heroActions, { top: insets.top + spacing[16] }]}>
            <IconButton
              icon="x"
              variant="Tonal"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
            />

            <View style={styles.heroActionsRight}>
              <IconButton
                icon="star"
                variant="Tonal"
                accessibilityLabel="Favoritar evento"
                // Favoritar é outra US; o botão existe no frame desta tela.
                onPress={() => addToast({ type: 'info', message: 'Favoritar chega em outra US.' })}
              />
              {event.viewer.is_organizer && (
                <IconButton
                  icon="settings"
                  variant="Tonal"
                  accessibilityLabel="Gerenciar evento"
                  onPress={() => router.push(`/ManageEvent?id=${event.event_id}`)}
                />
              )}
            </View>
          </View>

          <View style={styles.heroIdentity}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {event.title}
            </Text>

            {event.tags.length > 0 && (
              <View style={styles.heroTags}>
                {event.tags.map((tag, index) => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    // A primeira tag é a macro (fill sólido); as demais são
                    // micro (fill tonal), como no frame.
                    categoryType={index === 0 ? 'macro' : 'micro'}
                    size="md"
                    isSelected
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="calendar" size={20} color={colors.text.primary} absoluteStrokeWidth />
                <Text style={styles.infoText} numberOfLines={1}>
                  {formatDateTime(event.event_date)}
                </Text>
              </View>

              {event.privacy !== 'PRIVATE' && (
                <View style={styles.infoRow}>
                  <Icon name="map-pin" size={20} color={colors.text.primary} absoluteStrokeWidth />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {event.location_name}
                  </Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Badge family="Privacy" value={event.privacy} />
                {participationStatusBadge && <Badge family="Status" value={participationStatusBadge} />}
              </View>
            </View>
          </View>

          {/* Sem `participants_preview` o bloco some inteiro — nunca vira
              "0 confirmados". É o caso do evento privado sem participação. */}
          {preview && (
            <Pressable
              onPress={() => router.push(`/ManageEvent?id=${event.event_id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Ver os ${preview.count} confirmados`}
              style={styles.participation}
            >
              <Text style={styles.participationCount}>{preview.count} Confirmados</Text>
              {preview.interested_count !== undefined && (
                <>
                  <Text style={styles.participationSeparator}>·</Text>
                  <Text style={styles.participationInterested}>
                    {preview.interested_count} Interessados
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {showPendingBanner && (
            <View style={styles.section}>
              <Pressable
                onPress={() => router.push(`/ManageEvent?id=${event.event_id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${pendingCount} ${pendingCount === 1 ? 'pessoa aguardando' : 'pessoas aguardando'} aprovação. Abrir gestão do evento.`}
                style={styles.banner}
              >
                <Icon name="users" size={20} color={palette.warning.default} absoluteStrokeWidth />
                <Text style={styles.bannerText}>
                  {pendingCount === 1
                    ? '1 pessoa aguardando aprovação para participar.'
                    : `${pendingCount} pessoas aguardando aprovação para participar.`}
                </Text>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={palette.warning.default}
                  absoluteStrokeWidth
                />
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <Text style={styles.descriptionHeading} accessibilityRole="header">
              Descrição
            </Text>
            <Text style={styles.descriptionLead}>{descriptionLead}</Text>
            {descriptionRest.filter(Boolean).map((paragraph) => (
              <Text key={paragraph} style={styles.descriptionText}>
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {action && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing[20] }]}>
          <Button
            label={action.label}
            variant={action.variant}
            icon={action.icon}
            isLoading={(action.icon === 'share' && isSharing) || isSubmitting}
            onPress={onMainAction}
            style={styles.ctaButton}
          />
        </View>
      )}

      <Dialog
        visible={showCancelDialog}
        variant="LeaveEvent"
        title={isPendingCancel ? 'Cancelar solicitação?' : 'Cancelar presença?'}
        description={
          isPendingCancel
            ? 'Sua solicitação será removida da fila do organizador.'
            : 'Você deixa de aparecer na lista de confirmados. Pode confirmar de novo quando quiser.'
        }
        confirmLabel={isPendingCancel ? 'Cancelar solicitação' : 'Cancelar presença'}
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelDialog(false)}
        isLoading={isSubmitting}
      />
    </View>
  );
}

/** Esqueleto do carregamento: capa, título e blocos, nunca tela em branco. */
function EventDetailSkeleton() {
  return (
    <View style={styles.screen} accessibilityLabel="Carregando evento" accessibilityRole="progressbar">
      <View style={styles.skeletonHero} />
      <View style={styles.body}>
        <View style={styles.section}>
          <View style={[styles.skeletonBlock, styles.skeletonCard]} />
        </View>
        <View style={styles.section}>
          <View style={[styles.skeletonBlock, styles.skeletonLineShort]} />
        </View>
        <View style={styles.section}>
          <View style={[styles.skeletonBlock, styles.skeletonLine]} />
          <View style={[styles.skeletonBlock, styles.skeletonLine]} />
          <View style={[styles.skeletonBlock, styles.skeletonLineShort]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
  },

  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroActions: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  heroIdentity: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    bottom: spacing[16],
    gap: spacing[8],
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text.inverse,
  },
  heroTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },

  body: {
    paddingTop: spacing[20],
    gap: spacing[20],
  },
  /** Padding lateral de tela — sempre 16, como manda o guia. */
  section: {
    paddingHorizontal: spacing[16],
  },

  infoCard: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.md,
    padding: spacing[16],
    gap: spacing[12],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  infoText: {
    flex: 1,
    ...typography.bodyL,
    color: colors.text.primary,
  },

  participation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    minHeight: 44,
  },
  participationCount: {
    ...typography.labelM,
    color: colors.text.brand,
  },
  participationSeparator: {
    ...typography.labelM,
    color: colors.text.tertiary,
  },
  participationInterested: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    backgroundColor: palette.warning.bg,
  },
  bannerText: {
    flex: 1,
    ...typography.bodyM,
    color: palette.warning.default,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border.default,
  },

  descriptionHeading: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  descriptionLead: {
    ...typography.labelL,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  descriptionText: {
    ...typography.bodyM,
    color: colors.text.secondary,
    marginBottom: spacing[8],
  },

  cta: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    backgroundColor: colors.bg.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  ctaButton: {
    alignSelf: 'stretch',
  },

  skeletonHero: {
    height: HERO_HEIGHT,
    backgroundColor: colors.surface.sunken,
  },
  skeletonBlock: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  skeletonCard: {
    height: 120,
    borderRadius: radius.md,
  },
  skeletonLine: {
    height: 16,
    marginBottom: spacing[8],
  },
  skeletonLineShort: {
    height: 16,
    width: '60%',
  },
});