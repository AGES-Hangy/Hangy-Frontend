import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import type { MapPressEvent, Region } from 'react-native-maps';

import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { MapPin } from '@/components/MapPin';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useToast } from '@/components/Toast';
import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { distanceInMeters, useNearbyEvents } from '@/hooks/useNearbyEvents';
import { useParticipation, type ParticipationError } from '@/hooks/useParticipation';
import type { NearbyEventItem } from '@/types/event';

/** Porto Alegre — onde o mapa abre sem a posição do usuário. Negar a permissão não bloqueia a tela. */
const DEFAULT_REGION: Region = {
  latitude: -30.0346,
  longitude: -51.2177,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
/** Zoom ao centralizar no usuário — algumas quadras ao redor, como no Figma. */
const USER_REGION_DELTA = 0.02;
/** O CTA do estado vazio afasta o zoom: o raio da busca sai da área visível. */
const SEARCH_EXPAND_FACTOR = 3;
const MAP_ANIMATION_MS = 500;
/** Ponta do pin na coordenada do evento, não o centro do desenho. */
const PIN_ANCHOR = { x: 0.5, y: 1 };
const CENTER_ANCHOR = { x: 0.5, y: 0.5 };
/** Círculo do ícone do aviso — diâmetro do IconButton MD. */
const NOTICE_ICON_CIRCLE = 44;
const NOTICE_ICON_SIZE = 20;

type Coordinate = { latitude: number; longitude: number };
type LocationPermission = 'checking' | 'undetermined' | 'granted' | 'denied';

/**
 * `prompt`: pedido com contexto antes do diálogo do sistema (que só tem efeito
 * uma vez). `denied`: explica a limitação e deixa habilitar depois.
 * `unavailable`: permissão ok, mas o aparelho não devolveu a posição (GPS desligado).
 */
export type LocationNoticeKind = 'prompt' | 'denied' | 'unavailable';

const NOTICE_COPY = {
  prompt: {
    icon: 'map-pin',
    title: 'Veja o que está rolando perto de você',
    text: 'Sua localização só centraliza o mapa e busca eventos por perto. Ela não é salva nem compartilhada.',
  },
  denied: {
    icon: 'map-pin-off',
    title: 'Localização desativada',
    text: 'O mapa abriu numa posição padrão. Ative a localização para ver os eventos perto de você.',
  },
  unavailable: {
    icon: 'map-pin-off',
    title: 'Não foi possível obter sua posição',
    text: 'Verifique se o GPS está ligado. Enquanto isso, o mapa abriu numa posição padrão.',
  },
} as const;

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  const kilometers = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(meters / 1000);
  return `${kilometers} km`;
}

function toPreviewEvent(event: NearbyEventItem, userCoordinate: Coordinate | null): Event {
  return {
    id: event.event_id,
    title: event.title,
    date: event.event_date,
    location: event.location_name,
    imageUrl: event.cover_photo_url ?? '',
    // ⚠️ `GET /events/nearby` não devolve `privacy`, mas o MapPreview exige o
    // badge. Alinhar com a task 119 se o campo vier no contrato.
    privacy: 'PUBLIC',
    // `distance_m` é até o centro da busca, que muda ao arrastar o mapa; com a
    // posição do usuário em mãos, a distância é até ele.
    distance: formatDistance(
      userCoordinate ? distanceInMeters(userCoordinate, event.location) : event.distance_m,
    ),
  };
}

export interface LiveViewProps {
  mapRef: RefObject<MapView | null>;
  /** Status da permissão ainda sendo lido: skeleton no lugar do mapa. */
  isCheckingPermission: boolean;
  /** Busca de eventos em voo: indicador discreto no canto, sem bloquear o mapa. */
  isLoading: boolean;
  /** Sem rede: `OfflineBanner` no topo e ações de escrita desabilitadas. */
  isOffline: boolean;
  /** Região em que o mapa abre. */
  initialRegion: Region;
  events: NearbyEventItem[];
  /** Só um pin fica `Selected` por vez; quem controla é a tela. */
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onRegionChangeComplete: (region: Region) => void;
  userCoordinate: Coordinate | null;
  /** Busca concluída sem nenhum evento — não é erro. */
  showEmptyState: boolean;
  /** `false` quando a busca já está no raio máximo e ampliar não adianta. */
  canExpandSearch: boolean;
  locationNotice: LocationNoticeKind | null;
  canAskLocationAgain: boolean;
  onAllowLocation: () => void;
  onDismissLocationPrompt: () => void;
  onRetryLocation: () => void;
  onOpenEvent: (eventId: string) => void;
  onParticipationPress: (eventId: string) => void;
  participationLoading: boolean;
}

/**
 * Desenho da aba Ao Vivo, sem buscar nada — separado do container abaixo para
 * cada estado do Figma poder ser montado com dados fixos.
 */
export function LiveView({
  mapRef,
  isCheckingPermission,
  isLoading,
  isOffline,
  initialRegion,
  events,
  selectedEventId,
  onSelectEvent,
  onRegionChangeComplete,
  userCoordinate,
  showEmptyState,
  canExpandSearch,
  locationNotice,
  canAskLocationAgain,
  onAllowLocation,
  onDismissLocationPrompt,
  onRetryLocation,
  onOpenEvent,
  onParticipationPress,
  participationLoading,
}: LiveViewProps) {
  const regionRef = useRef(initialRegion);
  const selectedEvent = events.find((event) => event.event_id === selectedEventId) ?? null;

  function handleRegionChangeComplete(region: Region) {
    regionRef.current = region;
    onRegionChangeComplete(region);
  }

  function handleMapPress(event: MapPressEvent) {
    // No iOS o toque num pin também chega aqui; só o mapa vazio fecha o preview.
    if (event.nativeEvent.action === 'marker-press') return;
    onSelectEvent(null);
  }

  // Selecionar recentra o mapa no pin, mantendo o zoom atual.
  function handleSelectPin(event: NearbyEventItem) {
    onSelectEvent(event.event_id);
    mapRef.current?.animateToRegion({ ...regionRef.current, ...event.location }, MAP_ANIMATION_MS);
  }

  function handleRecenter() {
    if (!userCoordinate) return;
    mapRef.current?.animateToRegion(
      { ...userCoordinate, latitudeDelta: USER_REGION_DELTA, longitudeDelta: USER_REGION_DELTA },
      MAP_ANIMATION_MS,
    );
  }

  function handleExpandSearch() {
    const region = regionRef.current;
    mapRef.current?.animateToRegion(
      {
        ...region,
        latitudeDelta: Math.min(region.latitudeDelta * SEARCH_EXPAND_FACTOR, 90),
        longitudeDelta: Math.min(region.longitudeDelta * SEARCH_EXPAND_FACTOR, 180),
      },
      MAP_ANIMATION_MS,
    );
  }

  const notice = locationNotice ? NOTICE_COPY[locationNotice] : null;
  const isConfirmed = selectedEvent?.is_confirmed ?? false;

  // Skeleton do mapa: a área cinza (`surface.sunken`) sem nada por cima, até
  // saber a permissão — sem isto o aviso pisca antes de o status chegar.
  if (isCheckingPermission) {
    return (
      <View
        style={styles.container}
        accessibilityLabel="Carregando mapa"
        accessibilityRole="progressbar"
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        // O ponto do usuário é o MapPin UserLocation, não o marcador nativo.
        showsUserLocation={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        // Sem rotação, a área visível continua alinhada — é dela que sai o raio.
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {events.map((event) => {
          const isSelected = event.event_id === selectedEventId;
          return (
            <Marker
              key={event.event_id}
              coordinate={event.location}
              anchor={PIN_ANCHOR}
              zIndex={isSelected ? 2 : 1}
              onPress={() => handleSelectPin(event)}
              stopPropagation
            >
              <MapPin
                state={selectedEventId ? (isSelected ? 'Selected' : 'Unselected') : 'Default'}
                uri={event.cover_photo_url ?? undefined}
              />
            </Marker>
          );
        })}

        {userCoordinate && (
          <Marker coordinate={userCoordinate} anchor={CENTER_ANCHOR} zIndex={0} tappable={false}>
            <MapPin state="UserLocation" />
          </Marker>
        )}
      </MapView>

      {isOffline && <OfflineBanner />}
      <View style={[styles.topOverlay, isOffline && styles.topOverlayBelowBanner]} pointerEvents="box-none">
        {notice && locationNotice && (
          <View style={styles.notice}>
            <View style={styles.noticeHeader}>
              <View style={styles.noticeIcon} accessibilityElementsHidden importantForAccessibility="no">
                <Icon name={notice.icon} size={NOTICE_ICON_SIZE} color={colors.action.primary} />
              </View>
              <View style={styles.noticeTexts}>
                <Text style={styles.noticeTitle} accessibilityRole="header">
                  {notice.title}
                </Text>
                <Text style={styles.noticeText}>{notice.text}</Text>
              </View>
            </View>
            <View style={styles.noticeActions}>
              {locationNotice === 'prompt' && (
                <Button label="Agora não" variant="Tertiary" size="MD" onPress={onDismissLocationPrompt} style={styles.noticeAction} />
              )}
              <Button
                label={
                  locationNotice === 'prompt'
                    ? 'Permitir localização'
                    : locationNotice === 'unavailable'
                      ? 'Tentar de novo'
                      : canAskLocationAgain
                        ? 'Ativar localização'
                        : 'Abrir configurações'
                }
                variant={locationNotice === 'prompt' ? 'Primary' : 'Secondary'}
                size="MD"
                onPress={locationNotice === 'unavailable' ? onRetryLocation : onAllowLocation}
                style={styles.noticeAction}
              />
            </View>
          </View>
        )}
        {isLoading && (
          <View style={styles.loading} accessibilityLabel="Buscando eventos" accessibilityRole="progressbar">
            <ActivityIndicator size="small" color={colors.action.primary} />
          </View>
        )}
      </View>

      <View style={styles.bottomOverlay} pointerEvents="box-none">
        {userCoordinate && (
          <IconButton
            icon="compass"
            variant="Outline"
            accessibilityLabel="Centralizar no meu local"
            onPress={handleRecenter}
            style={styles.recenter}
          />
        )}
        {selectedEvent ? (
          // Botão sobreposto ao card, como irmão (não aninhado): o corpo abre o
          // detalhe, o botão confirma ou cancela presença.
          <View style={styles.previewCard}>
            <EventCard
              variant="MapPreview"
              event={toPreviewEvent(selectedEvent, userCoordinate)}
              onPress={() => onOpenEvent(selectedEvent.event_id)}
            />
            <View style={styles.previewAction} pointerEvents="box-none">
              <IconButton
                icon={isConfirmed ? 'x' : 'check'}
                variant={isConfirmed ? 'Outline' : 'Filled'}
                size="SM"
                disabled={participationLoading || isOffline}
                accessibilityLabel={
                  isConfirmed
                    ? `Cancelar presença em ${selectedEvent.title}`
                    : `Confirmar presença em ${selectedEvent.title}`
                }
                onPress={() => onParticipationPress(selectedEvent.event_id)}
              />
            </View>
          </View>
        ) : showEmptyState ? (
          <View style={styles.emptyCard}>
            <EmptyState
              context="Map"
              cta
              ctaLabel="Ampliar busca"
              onCtaPress={handleExpandSearch}
              ctaDisabled={!canExpandSearch}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function Live() {
  const mapRef = useRef<MapView>(null);
  const hasSearchedRef = useRef(false);
  const { addToast, showSuccessToast } = useToast();
  const { events, isLoading, isEmpty, isAtMaxRadius, search, searchNow, setConfirmed } = useNearbyEvents();
  const { isOffline } = useNetworkStatus();

  const [permission, setPermission] = useState<LocationPermission>('checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<Coordinate | null>(null);
  const [isLocationUnavailable, setIsLocationUnavailable] = useState(false);
  /** Incrementa no "Tentar de novo" do aviso de GPS para refazer a localização. */
  const [locateAttempt, setLocateAttempt] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isCancelDialogVisible, setIsCancelDialogVisible] = useState(false);
  const { join, cancel, isSubmitting } = useParticipation(selectedEventId ?? '');

  const applyPermission = useCallback((response: Location.LocationPermissionResponse) => {
    setCanAskAgain(response.canAskAgain);
    setPermission(response.granted ? 'granted' : response.status === 'undetermined' ? 'undetermined' : 'denied');
  }, []);

  // Quem foi habilitar nos Ajustes volta sem a tela remontar: relê o status.
  useEffect(() => {
    const check = () => Location.getForegroundPermissionsAsync().then(applyPermission, () => setPermission('denied'));
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => subscription.remove();
  }, [applyPermission]);

  // Sem permissão, a primeira busca é na posição padrão — o mapa segue navegável.
  useEffect(() => {
    if (permission === 'checking' || permission === 'granted' || hasSearchedRef.current) return;
    hasSearchedRef.current = true;
    void searchNow(DEFAULT_REGION);
  }, [permission, searchNow]);

  // Com permissão, centraliza no usuário. A coordenada só fica no aparelho:
  // centraliza o mapa e vai como centro da busca, nada além disso.
  useEffect(() => {
    if (permission !== 'granted') return;
    let cancelled = false;

    async function locate() {
      try {
        // Com o GPS desligado a última posição conhecida ainda pode existir (e
        // estar velha) — por isso o serviço é checado antes.
        if (!(await Location.hasServicesEnabledAsync())) throw new Error('Location services disabled');
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (cancelled) return;

        const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const region = { ...coordinate, latitudeDelta: USER_REGION_DELTA, longitudeDelta: USER_REGION_DELTA };
        setIsLocationUnavailable(false);
        setUserCoordinate(coordinate);
        mapRef.current?.animateToRegion(region, MAP_ANIMATION_MS);
        hasSearchedRef.current = true;
        void searchNow(region);
      } catch {
        if (cancelled) return;
        setIsLocationUnavailable(true);
        if (!hasSearchedRef.current) {
          hasSearchedRef.current = true;
          void searchNow(DEFAULT_REGION);
        }
      }
    }

    void locate();
    return () => {
      cancelled = true;
    };
  }, [permission, locateAttempt, searchNow]);

  // O evento selecionado saiu da área buscada: o preview fecha junto.
  useEffect(() => {
    if (selectedEventId && !events.some((event) => event.event_id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [events, selectedEventId]);

  const locationNotice: LocationNoticeKind | null =
    permission === 'undetermined' && !isPromptDismissed
      ? 'prompt'
      : permission === 'undetermined' || permission === 'denied'
        ? 'denied'
        : permission === 'granted' && isLocationUnavailable
          ? 'unavailable'
          : null;

  async function handleAllowLocation() {
    // Depois de uma negação definitiva o sistema não pergunta mais: só pelos Ajustes.
    if (permission === 'denied' && !canAskAgain) {
      await Linking.openSettings();
      return;
    }
    try {
      applyPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      setPermission('denied');
    }
  }

  async function handleParticipationPress(eventId: string) {
    const event = events.find((item) => item.event_id === eventId);
    if (!event) return;

    if (event.is_confirmed) {
      setIsCancelDialogVisible(true);
      return;
    }

    try {
      const result = await join();
      if (result.status === 'PENDING') {
        addToast({ type: 'info' });
      } else {
        setConfirmed(eventId, true);
        showSuccessToast(event.title);
      }
    } catch (error) {
      if ((error as ParticipationError).status === 409) {
        addToast({ type: 'warning', message: 'Este evento está lotado' });
      } else {
        addToast({ type: 'error', message: 'Não foi possível confirmar presença. Tente de novo.' });
      }
    }
  }

  async function handleCancelConfirm() {
    const eventId = selectedEventId;
    if (!eventId) return;
    try {
      await cancel();
      setConfirmed(eventId, false);
      addToast({ type: 'success', message: 'Participação cancelada.' });
    } catch {
      addToast({ type: 'error', message: 'Não foi possível cancelar. Tente de novo.' });
    } finally {
      setIsCancelDialogVisible(false);
    }
  }

  return (
    <>
      <LiveView
        mapRef={mapRef}
        isCheckingPermission={permission === 'checking'}
        isLoading={isLoading}
        isOffline={isOffline}
        initialRegion={DEFAULT_REGION}
        events={events}
        selectedEventId={selectedEventId}
        onSelectEvent={setSelectedEventId}
        onRegionChangeComplete={search}
        userCoordinate={userCoordinate}
        showEmptyState={isEmpty}
        canExpandSearch={!isAtMaxRadius}
        locationNotice={locationNotice}
        canAskLocationAgain={canAskAgain}
        onAllowLocation={() => void handleAllowLocation()}
        onDismissLocationPrompt={() => setIsPromptDismissed(true)}
        onRetryLocation={() => setLocateAttempt((attempt) => attempt + 1)}
        onOpenEvent={(eventId) => router.push(`/EventDetail?id=${eventId}`)}
        onParticipationPress={(eventId) => void handleParticipationPress(eventId)}
        participationLoading={isSubmitting}
      />

      <Dialog
        visible={isCancelDialogVisible}
        variant="LeaveEvent"
        title="Cancelar presença?"
        description="Você deixa de aparecer na lista de confirmados. Pode confirmar de novo quando quiser."
        confirmLabel="Cancelar presença"
        isLoading={isSubmitting}
        onConfirm={() => void handleCancelConfirm()}
        onCancel={() => setIsCancelDialogVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.sunken,
  },
  bottomOverlay: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    bottom: spacing[16],
    alignItems: 'center',
    gap: spacing[12],
  },
  topOverlay: {
    position: 'absolute',
    top: spacing[16],
    left: spacing[16],
    right: spacing[16],
    gap: spacing[12],
  },
  // O `OfflineBanner` ocupa o topo (top 8 + altura mínima 48): o aviso e o
  // indicador descem para não ficar por baixo dele.
  topOverlayBelowBanner: {
    top: spacing[64],
  },
  loading: {
    alignSelf: 'flex-end',
    padding: spacing[8],
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    ...elevation[2],
  },
  recenter: {
    alignSelf: 'flex-end',
    ...elevation[2],
  },
  // O card do Design System é plano; a sombra fica no wrapper porque aqui ele
  // flutua sobre o mapa.
  previewCard: {
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    ...elevation[2],
  },
  previewAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: spacing[12],
    justifyContent: 'center',
  },
  emptyCard: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    ...elevation[2],
  },
  notice: {
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    ...elevation[2],
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  noticeIcon: {
    width: NOTICE_ICON_CIRCLE,
    height: NOTICE_ICON_CIRCLE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary[100],
  },
  noticeTexts: {
    flex: 1,
    gap: spacing[4],
  },
  noticeTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  noticeText: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  noticeActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  noticeAction: {
    flex: 1,
  },
});
