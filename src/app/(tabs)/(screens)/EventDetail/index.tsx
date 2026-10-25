import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { OfflineBanner } from '@/components/OfflineBanner';
import { useToast } from '@/components/Toast';
import { Badge } from '@/components/Badge';
import { PHOTO_GRID_COLUMNS, PHOTO_GRID_GAP, PhotoTile } from '@/components/PhotoTile';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEvent } from '@/hooks/useEvent';
import { useEventShare } from '@/hooks/useEventShare';
import { useExperiencePhotos } from '@/hooks/useExperiencePhotos';
import type { PickedImage } from '@/hooks/useImageUpload';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useFavoriteEvent } from '@/hooks/useFavoriteEvent';
import { useInviteAccept, type InviteAcceptError } from '@/hooks/useInviteAccept';
import { useParticipation, type ParticipationError } from '@/hooks/useParticipation';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { ViewerAction } from '@/types/event';
import { formatDateTime } from '@/utils/datetime';
import { getToken } from '@/utils/auth';
import type { ApiError } from '@/utils/http';
import { PENDING_INVITE_KEY } from '@/constants/invite';

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
/** Altura da barra de progresso sobre a miniatura em envio. */
const UPLOAD_PROGRESS_HEIGHT = spacing[4];

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
  CANCEL_PRESENCE: { label: 'Cancelar presença', variant: 'Danger' },
  SHARE: { label: 'Compartilhar link', variant: 'Primary', icon: 'share' },
  MANAGE: { label: 'Gerenciar evento', variant: 'Primary', icon: 'settings' },
  NONE: null,
};

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token: inviteToken } = useLocalSearchParams<{ token?: string }>();
  const [inviteEventId, setInviteEventId] = useState<string | undefined>(undefined);
  // Derivado no render, sem passar por efeito: um efeito atrasaria o `id` novo
  // em um render e o hook de carga chegaria a buscar o evento anterior.
  const resolvedEventId = inviteToken ? inviteEventId : id;
  const [inviteStage, setInviteStage] = useState<'idle' | 'accepting' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<{ title: string; message: string } | null>(null);
  const { accept } = useInviteAccept();

  // O Expo Router reaproveita esta mesma instância ao navegar de um card de
  // evento pra outro (mesma rota, `id` diferente na URL), por isso o id vem
  // direto dos params. No fluxo de convite ele é resolvido a partir do token.

  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { event, isLoading, error, reload } = useEvent(resolvedEventId);
  const { share, isLoading: isSharing } = useEventShare(resolvedEventId);
  const { join, cancel, isSubmitting } = useParticipation(event?.event_id ?? resolvedEventId ?? '');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { isOffline } = useNetworkStatus();
  const { width: windowWidth } = useWindowDimensions();
  // A experiência exige descrição, e o frame não tem campo para ela: vai a do
  // evento, preenchida na criação. Sem descrição (opcional lá), vai o título.
  const experienceDescription = event?.description?.trim() || event?.title || '';
  const {
    photos,
    pickPhoto,
    pickError,
    uploadPhoto,
    removePhoto,
    dropPhoto,
    resetExperience,
    removingPhotoId,
  } = useExperiencePhotos(event?.event_id, experienceDescription);
  // 400/403 no envio: a ação some até o servidor mudar de ideia (novo evento).
  const [isPhotoActionHidden, setIsPhotoActionHidden] = useState(false);
  // 409 `Photo limit reached`: o botão continua lá, mas desabilitado.
  const [isPhotoLimitReached, setIsPhotoLimitReached] = useState(false);
  // Fotos cujo `DELETE` voltou 403: a lixeira some só delas.
  const [undeletablePhotoIds, setUndeletablePhotoIds] = useState<string[]>([]);
  const [photoToRemove, setPhotoToRemove] = useState<string | null>(null);

  useEffect(() => {
    setIsPhotoActionHidden(false);
    setIsPhotoLimitReached(false);
    setUndeletablePhotoIds([]);
    setPhotoToRemove(null);
  }, [event?.event_id]);

  // Arquivo recusado no aparelho: fora de JPG/PNG ou acima de 5 MB.
  useEffect(() => {
    if (pickError) addToast({ type: 'warning', message: pickError });
  }, [pickError]);
  const { user } = useCurrentUser();
  const { isFavorited, toggle: toggleFavorite } = useFavoriteEvent(
    event?.event_id,
    event?.viewer.is_favorited ?? false,
    {
      eventTitle: event?.title,
      onUnavailable: () => (router.canGoBack() ? router.back() : router.replace('/Home')),
    },
  );

  // Sem TopAppBar, o banner precisa da área segura para não ficar sob a barra de status.
  const offlineBanner = isOffline ? (
    <View style={[styles.offlineBanner, { top: insets.top }]}>
      <OfflineBanner />
    </View>
  ) : null;

  // Sem barra superior: os botões desta tela ficam por cima da capa, e uma
  // TopAppBar em cima disso viraria uma segunda linha de ações.
  useTopAppBar(null);

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;

    async function resolveInvite() {
      const sessionToken = await getToken();

      if (!sessionToken) {
        await AsyncStorage.setItem(PENDING_INVITE_KEY, inviteToken as string);
        router.replace('/Login');
        return;
      }

      setInviteStage('accepting');
      try {
        const result = await accept(inviteToken as string);
        if (cancelled) return;
        setInviteEventId(result.event_id);
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
        {offlineBanner}
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
        {offlineBanner}
      </View>
    );
  }

  if (isLoading) return <EventDetailSkeleton offlineBanner={offlineBanner} />;

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
        {offlineBanner}
      </View>
    );
  }

  const canFavorite = user?.userType === 'PERSONAL' && event.status !== 'CANCELLED';
  const action = MAIN_ACTION[event.viewer.available_action] ?? null;
  const preview = event.participants_preview;
  const pendingCount = event.pending_requests_count ?? 0;
  // Só o organizador vê o aviso, e só quando há alguém esperando.
  const showPendingBanner = event.viewer.is_organizer && pendingCount > 0;
  // Quem decide o que aparece no item Local é `location_precision`, nunca
  // `privacy`: evento privado do qual já participo vem `EXACT`. Campo ausente
  // (backend sem a task 270) conta como `EXACT`.
  const isLocationApproximate = event.location_precision === 'APPROXIMATE';
  const locationLabel = event.location_name || (isLocationApproximate ? 'Local aproximado' : null);
  // A descrição é opcional na criação e a API devolve `null` sem ela.
  const [descriptionLead, ...descriptionRest] = (event.description ?? '').split('\n');

  const isPendingCancel = event.viewer.participation_status === 'PENDING';
  // Mesma ação da API (CANCEL_PRESENCE) serve pra cancelar presença
  // confirmada ou solicitação pendente — só o rótulo muda, igual no Dialog
  // abaixo.
  const actionLabel =
    action && event.viewer.available_action === 'CANCEL_PRESENCE' && isPendingCancel
      ? 'Cancelar solicitação'
      : action?.label;
  const participationStatusBadge =
    event.viewer.participation_status === 'CONFIRMED' ||
    event.viewer.participation_status === 'PENDING' ||
    event.viewer.participation_status === 'REJECTED'
      ? event.viewer.participation_status
      : undefined;

  const isFinished = event.status === 'FINISHED';
  // Só quem confirmou presença num evento encerrado publica — fora disso a
  // ação nem aparece, para a UI não oferecer o que a API vai negar.
  const canAddPhoto =
    isFinished && event.viewer.participation_status === 'CONFIRMED' && !isPhotoActionHidden;
  const photoTileSize =
    (windowWidth - spacing[16] * 2 - PHOTO_GRID_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS;

  function startUpload(picked: PickedImage) {
    uploadPhoto(picked).catch((err) => handleUploadError(err as ApiError, picked));
  }

  async function handleAddPhoto() {
    const picked = await pickPhoto();
    if (picked) startUpload(picked);
  }

  /** Tabela de tratamento de erro da task — envio da foto. */
  function handleUploadError(apiError: ApiError, picked: PickedImage) {
    const retry = { actionLabel: 'Tentar de novo', onAction: () => startUpload(picked) };

    if (apiError.kind === 'timeout') {
      addToast({ type: 'error', message: 'A conexão demorou demais', ...retry });
      return;
    }
    if (apiError.kind === 'network') {
      addToast({ type: 'error', message: 'Sem conexão com a internet' });
      return;
    }

    switch (apiError.status) {
      case 400:
        addToast({ type: 'info', message: 'Você pode adicionar fotos depois que o evento terminar' });
        setIsPhotoActionHidden(true);
        return;
      case 403:
        addToast({ type: 'warning', message: 'Só quem participou pode adicionar fotos' });
        setIsPhotoActionHidden(true);
        return;
      case 404:
        if (apiError.detail === 'Experience not found') {
          // Experiência guardada sumiu no servidor: esquece e recarrega.
          resetExperience();
          reload();
          return;
        }
        addToast({ type: 'error', message: 'Evento não encontrado ou não disponível para você' });
        router.back();
        return;
      case 409:
        if (apiError.detail === 'Photo limit reached') {
          addToast({ type: 'warning', message: 'Você atingiu o limite de fotos para este evento' });
          setIsPhotoLimitReached(true);
          return;
        }
        // `Experience already exists`: o usuário já tem registro neste evento
        // e a API não devolve o id dele — tentar de novo não resolve.
        addToast({ type: 'error', message: 'Não foi possível enviar a foto.' });
        return;
      case 413:
        addToast({ type: 'warning', message: 'A foto precisa ter até 5 MB' });
        return;
      case 415:
        addToast({ type: 'warning', message: 'Use uma foto em JPG ou PNG' });
        return;
      default:
        addToast({ type: 'error', message: 'Não foi possível enviar a foto. Tente de novo.', ...retry });
    }
  }

  async function handleRemoveConfirm() {
    const photoId = photoToRemove;
    if (!photoId) return;
    try {
      await removePhoto(photoId);
      setPhotoToRemove(null);
    } catch (err) {
      setPhotoToRemove(null);
      const apiError = err as ApiError;
      if (apiError.status === 403) {
        addToast({ type: 'warning', message: 'Você não pode remover esta foto' });
        setUndeletablePhotoIds((ids) => [...ids, photoId]);
      } else if (apiError.status === 404) {
        // `Photo not found`: silencioso, a foto só sai da grade.
        dropPhoto(photoId);
      } else if (apiError.kind === 'timeout') {
        addToast({ type: 'error', message: 'A conexão demorou demais' });
      } else if (apiError.kind === 'network') {
        addToast({ type: 'error', message: 'Sem conexão com a internet' });
      } else {
        addToast({ type: 'error', message: 'Não foi possível remover a foto. Tente de novo.' });
      }
    }
  }

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

    if (event!.viewer.available_action === 'CANCEL_PRESENCE') {
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

          <View style={[styles.heroActions, { top: insets.top + (isOffline ? spacing[64] : spacing[16]) }]}>
            <IconButton
              icon="x"
              variant="Tonal"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
            />

            <View style={styles.heroActionsRight}>
              {canFavorite && (
                <IconButton
                  icon="star"
                  variant={isFavorited ? 'Filled' : 'Tonal'}
                  iconFilled={isFavorited}
                  accessibilityLabel={isFavorited ? 'Remover dos favoritos' : 'Favoritar evento'}
                  disabled={isOffline}
                  onPress={toggleFavorite}
                />
              )}
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
          {isFinished && (
            <View style={styles.section}>
              <View style={styles.finishedBanner}>
                <Icon name="info" size={20} color={palette.info.default} absoluteStrokeWidth />
                <Text style={styles.finishedBannerText}>Este evento já aconteceu.</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="calendar" size={20} color={colors.text.primary} absoluteStrokeWidth />
                <Text style={styles.infoText} numberOfLines={1}>
                  {formatDateTime(event.event_date)}
                </Text>
              </View>

              {locationLabel && (
                <View style={styles.infoRow}>
                  <Icon name="map-pin" size={20} color={colors.text.primary} absoluteStrokeWidth />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {locationLabel}
                  </Text>
                </View>
              )}

              {isLocationApproximate && (
                <Text style={styles.locationHint}>
                  Área aproximada. O endereço exato aparece quando o organizador aprovar sua
                  participação.
                </Text>
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

          {/* Fotos que o usuário adicionou nesta visita. Enquanto envia, a
              miniatura otimista mostra o progresso; o resto da tela segue
              utilizável. A lixeira só aparece depois do 201 — antes disso a
              foto ainda não é do servidor. */}
          {photos.length > 0 && (
            <View style={[styles.section, styles.photoGrid]}>
              {photos.map((photo, index) => {
                const position = `Foto ${index + 1} de ${photos.length}`;
                const isUploading = photo.photoId === null;
                const percent = Math.round(photo.progress * 100);
                const canRemove =
                  !isUploading &&
                  !isOffline &&
                  removingPhotoId !== photo.photoId &&
                  !undeletablePhotoIds.includes(photo.photoId as string);

                return (
                  <View key={photo.localId} style={{ width: photoTileSize }}>
                    <PhotoTile
                      uri={photo.uri}
                      accessibilityLabel={isUploading ? `${position}, enviando` : position}
                      removeAccessibilityLabel={`Remover ${position.toLowerCase()}`}
                      onRemove={canRemove ? () => setPhotoToRemove(photo.photoId) : undefined}
                    />
                    {isUploading && (
                      <View
                        style={styles.uploadTrack}
                        accessibilityRole="progressbar"
                        accessibilityLabel={`Enviando ${position.toLowerCase()}`}
                        accessibilityValue={{ min: 0, max: 100, now: percent }}
                      >
                        <View style={[styles.uploadFill, { width: `${percent}%` }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.divider} />
          </View>

          <View style={styles.section}>
            <Text style={styles.descriptionHeading} accessibilityRole="header">
              Descrição
            </Text>
            {descriptionLead ? (
              <Text style={styles.descriptionLead}>{descriptionLead}</Text>
            ) : (
              <Text style={styles.descriptionText}>Sem descrição.</Text>
            )}
            {descriptionRest.filter(Boolean).map((paragraph) => (
              <Text key={paragraph} style={styles.descriptionText}>
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {canAddPhoto ? (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing[20] }]}>
          <Button
            label="Adicionar foto ao meu registro"
            icon="camera"
            // Offline e limite atingido: escrita desabilitada, não escondida.
            disabled={isOffline || isPhotoLimitReached}
            onPress={handleAddPhoto}
            style={styles.ctaButton}
          />
        </View>
      ) : action && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing[20] }]}>
          <Button
            label={actionLabel ?? action.label}
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

      <Dialog
        visible={photoToRemove !== null}
        variant="DeleteEvent"
        title="Remover foto?"
        description="A foto deixa de aparecer no evento e no seu perfil."
        confirmLabel="Remover"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setPhotoToRemove(null)}
        isLoading={removingPhotoId !== null}
      />

      {offlineBanner}
    </View>
  );
}

/** Esqueleto do carregamento: capa, título e blocos, nunca tela em branco. */
function EventDetailSkeleton({ offlineBanner }: { offlineBanner: ReactNode }) {
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
      {offlineBanner}
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
  offlineBanner: {
    position: 'absolute',
    pointerEvents: 'box-none',
    left: 0,
    right: 0,
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

  finishedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    backgroundColor: palette.info.bg,
  },
  finishedBannerText: {
    flex: 1,
    ...typography.bodyM,
    color: palette.info.default,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
  },
  uploadTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: UPLOAD_PROGRESS_HEIGHT,
    backgroundColor: colors.surface.sunken,
  },
  uploadFill: {
    height: '100%',
    backgroundColor: colors.action.primary,
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
  locationHint: {
    ...typography.bodyS,
    color: colors.text.secondary,
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