import { Image } from 'expo-image';
import Svg, { Defs, FeGaussianBlur, Filter, Path } from 'react-native-svg';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useId, useState } from 'react';

import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { MapPinProps, MapPinState } from './types';

export type { MapPinProps, MapPinState } from './types';

const PIN_WIDTH = 60;
const PIN_HEIGHT = 73;
const SELECTED_PIN_WIDTH = 70;
const SELECTED_PIN_HEIGHT = 85;
const SELECTED_HALO_SIZE = 86;
const SELECTED_INSET = (SELECTED_HALO_SIZE - SELECTED_PIN_WIDTH) / 2;
const EVENT_PHOTO_SIZE = 44;
const PHOTO_FRAME_SIZE = 50;
const PHOTO_BORDER_WIDTH = 3;
const CLUSTER_SIZE = 52;
const CLUSTER_BORDER_WIDTH = 3;
const USER_HALO_SIZE = 40;
const USER_HALO_BORDER_WIDTH = 1;
const USER_DOT_SIZE = 18;
const USER_DOT_BORDER_WIDTH = 3;
const MIN_TOUCH_SIZE = 44;
const LOCK_BADGE_SIZE = 20;
const LOCK_BADGE_BORDER_WIDTH = 2;
const LOCK_ICON_SIZE = 12;
// Centro do selo: ponto a 45° na borda da cabeça do pin (círculo de raio 30
// centrado em 30,30 no viewBox de PIN_PATH), no canto superior direito.
const LOCK_BADGE_CENTER_X = 30 + 30 * Math.SQRT1_2;
const LOCK_BADGE_CENTER_Y = 30 - 30 * Math.SQRT1_2;
const ABSOLUTE_FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const PIN_PATH =
  'M30 0C13.43 0 0 13.43 0 30c0 17.12 30 43 30 43s30-25.88 30-43C60 13.43 46.57 0 30 0Z';

type PinMetrics = {
  width: number;
  height: number;
  haloSize: number;
  inset: number;
};

const PIN_METRICS: Record<'Default' | 'Unselected' | 'Selected', PinMetrics> = {
  Default: { width: PIN_WIDTH, height: PIN_HEIGHT, haloSize: 0, inset: 0 },
  Unselected: { width: PIN_WIDTH, height: PIN_HEIGHT, haloSize: 0, inset: 0 },
  Selected: {
    width: SELECTED_PIN_WIDTH,
    height: SELECTED_PIN_HEIGHT,
    haloSize: SELECTED_HALO_SIZE,
    inset: SELECTED_INSET,
  },
};

const PIN_COLORS: Record<'Default' | 'Unselected' | 'Selected', string> = {
  Default: colors.action.primary,
  Unselected: palette.neutral[400],
  Selected: palette.primary[700],
};

// MapPin/LockBadge: palette/primary/700; em Unselected acompanha o
// esmaecimento do pin (palette/neutral/400).
const LOCK_BADGE_COLORS: Record<'Default' | 'Unselected' | 'Selected', string> = {
  Default: palette.primary[700],
  Unselected: palette.neutral[400],
  Selected: palette.primary[700],
};

const PIN_SHADOWS = {
  Default: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: layout.mapPinShadows.default.offsetY },
    shadowOpacity: 0.18,
    shadowRadius: layout.mapPinShadows.default.blur,
    elevation: layout.mapPinShadows.default.offsetY,
  },
  Unselected: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: layout.mapPinShadows.unselected.offsetY },
    shadowOpacity: 0.12,
    shadowRadius: layout.mapPinShadows.unselected.blur,
    elevation: layout.mapPinShadows.unselected.offsetY,
  },
  Selected: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: layout.mapPinShadows.selected.offsetY },
    shadowOpacity: 0.24,
    shadowRadius: layout.mapPinShadows.selected.blur,
    elevation: layout.mapPinShadows.selected.offsetY,
  },
} as const;

const CLUSTER_SHADOW = {
  shadowColor: palette.neutral[950],
  shadowOffset: { width: 0, height: layout.mapPinShadows.cluster.offsetY },
  shadowOpacity: 0.2,
  shadowRadius: layout.mapPinShadows.cluster.blur,
  elevation: layout.mapPinShadows.cluster.offsetY,
} as const;

/**
 * Quanto a sombra borrada passa do desenho: o desfoque gaussiano vai até ~3σ
 * (σ = blur / 2) e ainda desce `offsetY`.
 */
function shadowSpread(blur: number) {
  return Math.ceil(blur * 1.5);
}

type EventPinState = 'Default' | 'Unselected' | 'Selected';

/**
 * Geometria do pin de evento dentro do marker. O marker do mapa é recortado
 * no tamanho da View (no Android vira bitmap; no iOS o SVG corta no próprio
 * viewport), então a sobra da sombra e do selo de cadeado entra no tamanho do
 * container — senão a sombra aparece cortada reta embaixo e nas laterais. A
 * sobra lateral entra dos dois lados para a ponta continuar no centro.
 */
function eventPinLayout(state: EventPinState, isApproximate: boolean) {
  const { width, height, haloSize, inset } = PIN_METRICS[state];
  const scale = width / PIN_WIDTH;
  const shadow = PIN_SHADOWS[state];
  const spread = shadowSpread(shadow.shadowRadius);
  const offsetY = shadow.shadowOffset.height;

  const baseWidth = haloSize || width;
  const baseHeight = height + inset;
  const badgeLeft = inset + LOCK_BADGE_CENTER_X * scale - LOCK_BADGE_SIZE / 2;
  const badgeTop = inset + LOCK_BADGE_CENTER_Y * scale - LOCK_BADGE_SIZE / 2;

  // O halo do selecionado já sobra `inset` em volta do pin.
  const shadowX = Math.max(0, spread - inset);
  const shadowTop = Math.max(0, spread - offsetY - inset);
  const shadowBottom = spread + offsetY;
  const badgeX = isApproximate ? Math.max(0, badgeLeft + LOCK_BADGE_SIZE - baseWidth) : 0;
  const badgeY = isApproximate ? Math.max(0, -badgeTop) : 0;

  const outsetX = Math.max(shadowX, badgeX);
  const outsetTop = Math.max(shadowTop, badgeY);
  const totalWidth = baseWidth + outsetX * 2;
  const totalHeight = outsetTop + baseHeight + shadowBottom;

  return {
    width,
    height,
    haloSize,
    inset,
    scale,
    badgeLeft,
    badgeTop,
    outsetX,
    outsetTop,
    totalWidth,
    totalHeight,
    // A ponta do pin fica acima da sobra da sombra, não na base da View.
    anchor: { x: 0.5, y: (outsetTop + baseHeight) / totalHeight },
  };
}

/**
 * Âncora do `Marker` para um pin de evento: a ponta do pin na coordenada.
 * Muda com o estado e o selo, porque a sobra da sombra muda junto.
 */
export function getEventPinAnchor(state: EventPinState = 'Default', isApproximate = false) {
  return eventPinLayout(state, isApproximate).anchor;
}

const CLUSTER_OUTSET =
  shadowSpread(layout.mapPinShadows.cluster.blur) + layout.mapPinShadows.cluster.offsetY;

/**
 * Âncora do `Marker` para o pin `Cluster`: o círculo fica na altura da cabeça
 * dos pins de evento (centro da cabeça a 43 da ponta), não centrado na
 * coordenada — senão o grupo aparece ~40 pontos abaixo dos pins vizinhos e
 * por cima deles.
 */
export function getClusterPinAnchor() {
  const total = CLUSTER_SIZE + CLUSTER_OUTSET * 2;
  const headCenterAboveTip = PIN_HEIGHT - PIN_WIDTH / 2;
  return { x: 0.5, y: Math.min(1, (CLUSTER_OUTSET + CLUSTER_SIZE / 2 + headCenterAboveTip) / total) };
}

const USER_DOT_SHADOW = {
  shadowColor: palette.neutral[950],
  shadowOffset: { width: 0, height: layout.mapPinShadows.userLoc.offsetY },
  shadowOpacity: 0.2,
  shadowRadius: layout.mapPinShadows.userLoc.blur,
  elevation: layout.mapPinShadows.userLoc.offsetY,
} as const;

function getAccessibilityLabel(
  state: MapPinState,
  count?: number,
  isApproximate?: boolean,
) {
  const event = isApproximate
    ? 'Evento privado, local aproximado'
    : 'Evento no mapa';

  switch (state) {
    case 'Default':
      return event;
    case 'Unselected':
      return `${event}, não selecionado`;
    case 'Selected':
      return `${event}, selecionado`;
    case 'Cluster':
      return `Grupo com ${count} eventos`;
    case 'UserLocation':
      return 'Sua localização no mapa';
  }
}

function EventPin({
  state,
  uri,
  isApproximate = false,
}: {
  state: EventPinState;
  uri?: string;
  isApproximate?: boolean;
}) {
  const [loadedUri, setLoadedUri] = useState<string>();
  const filterId = `map-pin-shadow-${useId().replace(/:/g, '')}`;
  const {
    width,
    height,
    haloSize,
    inset,
    scale,
    badgeLeft,
    badgeTop,
    outsetX,
    outsetTop,
    totalWidth,
    totalHeight,
  } = eventPinLayout(state, isApproximate);
  const shadow = PIN_SHADOWS[state];
  const photoFrameSize = PHOTO_FRAME_SIZE * scale;
  const photoBorderWidth = PHOTO_BORDER_WIDTH * scale;
  const photoSize = EVENT_PHOTO_SIZE * scale;
  const isUnselected = state === 'Unselected';
  const pinLeft = inset + outsetX;
  const pinTop = inset + outsetTop;

  return (
    <View
      style={[styles.pinContainer, { width: totalWidth, height: totalHeight }]}
      pointerEvents="none"
    >
      {state === 'Selected' && (
        <View
          style={[
            styles.selectedHalo,
            {
              width: haloSize,
              height: haloSize,
              left: outsetX,
              top: outsetTop,
              borderRadius: radius.full,
            },
          ]}
        />
      )}
      {/* O SVG cobre o marker inteiro (não só o pin) para a sombra caber no viewport. */}
      <Svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`${-pinLeft / scale} ${-pinTop / scale} ${totalWidth / scale} ${totalHeight / scale}`}
        accessible={false}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <Filter
            id={filterId}
            x={-pinLeft / scale}
            y={-pinTop / scale}
            width={totalWidth / scale}
            height={totalHeight / scale}
            filterUnits="userSpaceOnUse"
          >
            <FeGaussianBlur stdDeviation={shadow.shadowRadius / 2} />
          </Filter>
        </Defs>
        <Path
          d={PIN_PATH}
          fill={palette.neutral[950]}
          opacity={shadow.shadowOpacity}
          transform={`translate(0 ${shadow.shadowOffset.height})`}
          filter={`url(#${filterId})`}
        />
        <Path d={PIN_PATH} fill={PIN_COLORS[state]} />
      </Svg>
      <View
        style={[
          styles.pin,
          {
            width,
            height,
            left: pinLeft,
            top: pinTop,
          },
        ]}
      >
        <View
          style={[
            styles.photoFrame,
            {
              width: photoFrameSize,
              height: photoFrameSize,
              top: spacing[4] + scale,
              borderRadius: radius.full,
              borderWidth: photoBorderWidth,
            },
          ]}
        >
          <View
            style={[
              styles.photoClip,
              {
                top: photoBorderWidth,
                right: photoBorderWidth,
                bottom: photoBorderWidth,
                left: photoBorderWidth,
                borderRadius: radius.full,
              },
            ]}
          >
            {uri ? (
              <>
                {loadedUri !== uri && (
                  <View style={styles.photoPlaceholder}>
                    <Icon
                      name="image"
                      size={photoSize / 2}
                      color={colors.action.primary}
                    />
                  </View>
                )}
                <Image
                  key={uri}
                  source={{ uri }}
                  style={styles.photo}
                  contentFit="cover"
                  onLoad={() => setLoadedUri(uri)}
                  onError={() => setLoadedUri(undefined)}
                  accessible={false}
                />
                {isUnselected && (
                  <View style={styles.photoVeil} />
                )}
              </>
            ) : (
              <Icon
                name="image"
                size={photoSize / 2}
                color={colors.action.primary}
              />
            )}
          </View>
        </View>
      </View>
      {isApproximate && (
        <View
          style={[
            styles.lockBadge,
            {
              left: badgeLeft + outsetX,
              top: badgeTop + outsetTop,
              backgroundColor: LOCK_BADGE_COLORS[state],
            },
          ]}
        >
          <Icon
            name="lock"
            size={LOCK_ICON_SIZE}
            color={colors.text.inverse}
          />
        </View>
      )}
    </View>
  );
}

function ClusterPin({ count }: { count: number }) {
  // Sobra igual nos quatro lados: a sombra cabe no marker e o centro continua
  // no meio (âncora 0.5, 0.5).
  return (
    <View style={{ padding: CLUSTER_OUTSET }} pointerEvents="none">
      <View style={[styles.cluster, CLUSTER_SHADOW]}>
        <Text
          style={styles.clusterCount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

function UserLocationPin() {
  return (
    <View style={styles.userLocation}>
      <View style={styles.userHaloFill} />
      <View style={styles.userHaloRing} />
      <View style={[styles.userDot, USER_DOT_SHADOW]} />
    </View>
  );
}

export function MapPin(props: MapPinProps) {
  const state = props.state ?? 'Default';
  const isApproximate =
    props.state !== 'Cluster' && props.state !== 'UserLocation'
      ? props.isApproximate
      : undefined;
  const accessibilityLabel = getAccessibilityLabel(
    props.state === 'Cluster' ? 'Cluster' : state,
    props.state === 'Cluster' ? props.count : undefined,
    isApproximate,
  );
  const minDimension =
    state === 'Cluster'
      ? CLUSTER_SIZE
      : state === 'UserLocation'
        ? USER_HALO_SIZE
        : Math.min(PIN_METRICS[state].width, PIN_METRICS[state].height);
  const hitSlop = Math.max(0, (MIN_TOUCH_SIZE - minDimension) / 2);
  let content;
  if (props.state === 'Cluster') {
    content = <ClusterPin count={props.count} />;
  } else if (props.state === 'UserLocation') {
    content = <UserLocationPin />;
  } else {
    content = (
      <EventPin
        state={props.state ?? 'Default'}
        uri={props.uri}
        isApproximate={isApproximate}
      />
    );
  }

  if (props.onPress) {
    return (
      <Pressable
        onPress={props.onPress}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pinContainer: {
    position: 'relative',
  },
  selectedHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: palette.primary[500],
    opacity: 0.22,
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    width: LOCK_BADGE_SIZE,
    height: LOCK_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: LOCK_BADGE_BORDER_WIDTH,
    borderColor: colors.surface.card,
    borderRadius: radius.full,
  },
  photoFrame: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderColor: colors.bg.base,
    backgroundColor: 'transparent',
  },
  photoClip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.primary[100],
  },
  photoPlaceholder: {
    ...ABSOLUTE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    ...ABSOLUTE_FILL,
  },
  photoVeil: {
    ...ABSOLUTE_FILL,
    backgroundColor: colors.bg.base,
    opacity: 0.55,
  },
  cluster: {
    width: CLUSTER_SIZE,
    height: CLUSTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: CLUSTER_BORDER_WIDTH,
    borderColor: colors.bg.base,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
  },
  clusterCount: {
    ...typography.labelL,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  userLocation: {
    width: USER_HALO_SIZE,
    height: USER_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userHaloFill: {
    ...ABSOLUTE_FILL,
    borderRadius: radius.full,
    backgroundColor: palette.info.default,
    opacity: 0.2,
  },
  userHaloRing: {
    ...ABSOLUTE_FILL,
    borderWidth: USER_HALO_BORDER_WIDTH,
    borderColor: palette.info.default,
    borderRadius: radius.full,
    opacity: 0.4,
  },
  userDot: {
    width: USER_DOT_SIZE,
    height: USER_DOT_SIZE,
    borderWidth: USER_DOT_BORDER_WIDTH,
    borderColor: colors.bg.base,
    borderRadius: radius.full,
    backgroundColor: palette.info.default,
  },
});
