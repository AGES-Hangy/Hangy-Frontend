import { Image } from 'expo-image';
import Svg, { Defs, FeGaussianBlur, Filter, Path } from 'react-native-svg';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useId, useState } from 'react';

import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
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

const PIN_SHADOWS = {
  Default: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: spacing[4] },
    shadowOpacity: 0.18,
    shadowRadius: spacing[8],
    elevation: spacing[4],
  },
  Unselected: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: spacing[4] / 2 },
    shadowOpacity: 0.12,
    shadowRadius: spacing[4] + 1,
    elevation: spacing[4] / 2,
  },
  Selected: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: spacing[4] + 2 },
    shadowOpacity: 0.24,
    shadowRadius: spacing[12],
    elevation: spacing[4] + 2,
  },
} as const;

const CLUSTER_SHADOW = {
  shadowColor: palette.neutral[950],
  shadowOffset: { width: 0, height: spacing[4] },
  shadowOpacity: 0.2,
  shadowRadius: spacing[8] + 2,
  elevation: spacing[4],
} as const;

const USER_DOT_SHADOW = {
  shadowColor: palette.neutral[950],
  shadowOffset: { width: 0, height: spacing[4] / 4 },
  shadowOpacity: 0.2,
  shadowRadius: spacing[4] - 1,
  elevation: 1,
} as const;

function getAccessibilityLabel(state: MapPinState, count?: number) {
  switch (state) {
    case 'Default':
      return 'Evento no mapa';
    case 'Unselected':
      return 'Evento no mapa, não selecionado';
    case 'Selected':
      return 'Evento no mapa, selecionado';
    case 'Cluster':
      return `Grupo com ${count} eventos`;
    case 'UserLocation':
      return 'Sua localização no mapa';
  }
}

function EventPin({
  state,
  uri,
}: {
  state: 'Default' | 'Unselected' | 'Selected';
  uri?: string;
}) {
  const [loadedUri, setLoadedUri] = useState<string>();
  const filterId = `map-pin-shadow-${useId().replace(/:/g, '')}`;
  const { width, height, haloSize, inset } = PIN_METRICS[state];
  const scale = width / PIN_WIDTH;
  const photoFrameSize = PHOTO_FRAME_SIZE * scale;
  const photoBorderWidth = PHOTO_BORDER_WIDTH * scale;
  const photoSize = EVENT_PHOTO_SIZE * scale;
  const isUnselected = state === 'Unselected';

  return (
    <View
      style={[
        styles.pinContainer,
        {
          width: haloSize || width,
          height: height + inset,
        },
      ]}
      pointerEvents="none"
    >
      {state === 'Selected' && (
        <View
          style={[
            styles.selectedHalo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: radius.full,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.pin,
          {
            width,
            height,
            left: inset,
            top: inset,
          },
        ]}
      >
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${PIN_WIDTH} ${PIN_HEIGHT}`}
          accessible={false}
          style={[StyleSheet.absoluteFill, styles.pinSvg]}
        >
          <Defs>
            <Filter
              id={filterId}
              x={-PIN_SHADOWS[state].shadowRadius * 2}
              y={-PIN_SHADOWS[state].shadowRadius * 2}
              width={PIN_WIDTH + PIN_SHADOWS[state].shadowRadius * 4}
              height={PIN_HEIGHT + PIN_SHADOWS[state].shadowRadius * 4}
              filterUnits="userSpaceOnUse"
            >
              <FeGaussianBlur stdDeviation={PIN_SHADOWS[state].shadowRadius / 2} />
            </Filter>
          </Defs>
          <Path
            d={PIN_PATH}
            fill={palette.neutral[950]}
            opacity={PIN_SHADOWS[state].shadowOpacity}
            transform={`translate(0 ${PIN_SHADOWS[state].shadowOffset.height})`}
            filter={`url(#${filterId})`}
          />
          <Path d={PIN_PATH} fill={PIN_COLORS[state]} />
        </Svg>

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
                      name="calendar"
                      size={photoSize / 2}
                      color={isUnselected ? palette.neutral[600] : colors.action.primary}
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
                name="calendar"
                size={photoSize / 2}
                color={isUnselected ? palette.neutral[600] : colors.action.primary}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function ClusterPin({ count }: { count: number }) {
  return (
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
  const accessibilityLabel = getAccessibilityLabel(
    props.state === 'Cluster' ? 'Cluster' : state,
    props.state === 'Cluster' ? props.count : undefined,
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
    content = <EventPin state={props.state ?? 'Default'} uri={props.uri} />;
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
  pinSvg: {
    overflow: 'visible',
  },
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
    backgroundColor: 'transparent',
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