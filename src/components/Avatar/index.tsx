import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type {
  AvatarProps,
  AvatarSize,
  StoreAvatarSize,
} from '@/components/Avatar/types';
import { colors, palette } from '@/constants/colors';
import { radius } from '@/constants/layout';

/** Métricas exatas das cinco variações de usuário da prancha do Figma. */
const SIZES = {
  XS: { diameter: 48, icon: 24 },
  SM: { diameter: 64, icon: 32 },
  MD: { diameter: 80, icon: 40 },
  LG: { diameter: 112, icon: 56 },
  XL: { diameter: 160, icon: 80 },
} as const satisfies Record<AvatarSize, { diameter: number; icon: number }>;

/** Os tamanhos desenhados para o avatar de loja são 80, 112 e 160. */
const STORE_SIZES: ReadonlySet<AvatarSize> = new Set<StoreAvatarSize>(['MD', 'LG', 'XL']);

const CAMERA_SIZE = 40;
const CAMERA_ICON_SIZE = 20;
const CAMERA_BORDER_WIDTH = 4;
const CAMERA_OFFSET = -6;
const MIN_TOUCH_SIZE = 44;
const PRESSED_OPACITY = 0.85;

/**
 * Avatar do Design System, com fallback para pessoa/loja, foto e variação
 * editável com câmera.
 *
 * ```tsx
 * <Avatar size="LG" accessibilityLabel="Foto de Ana" />
 * <Avatar variant="Store" size="XL" source={{ uri: store.logoUrl }} />
 * <Avatar source={require('../../../assets/avatar.png')} onCameraPress={pickImage} />
 * ```
 */
export function Avatar({
  variant = 'User',
  size = 'MD',
  source,
  accessibilityLabel,
  onCameraPress,
  cameraAccessibilityLabel = 'Alterar foto',
  style,
}: AvatarProps) {
  // A união em `AvatarProps` já garante isto no TypeScript. A guarda mantém o
  // componente previsível caso props sem tipagem cheguem de JavaScript/JSON.
  const resolvedSize = variant === 'Store' && !STORE_SIZES.has(size) ? 'MD' : size;
  const metrics = SIZES[resolvedSize];
  const isDecorative = accessibilityLabel === undefined;
  const cameraHitSlop = Math.max(0, (MIN_TOUCH_SIZE - CAMERA_SIZE) / 2);

  return (
    <View style={[{ width: metrics.diameter, height: metrics.diameter }, style]}>
      <View
        style={[
          styles.circle,
          {
            width: metrics.diameter,
            height: metrics.diameter,
            backgroundColor:
              variant === 'Store' ? palette.secondary[100] : palette.primary[200],
          },
        ]}
        aria-hidden={isDecorative || undefined}
        accessibilityRole={isDecorative ? undefined : 'image'}
        accessibilityLabel={accessibilityLabel}
      >
        {source ? (
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            accessible={false}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Icon
            name={variant === 'Store' ? 'store' : 'user'}
            size={metrics.icon}
            color={variant === 'Store' ? palette.secondary[700] : palette.primary[600]}
            strokeWidth={2}
          />
        )}
      </View>

      {onCameraPress && (
        <Pressable
          onPress={onCameraPress}
          hitSlop={cameraHitSlop}
          accessibilityRole="button"
          accessibilityLabel={cameraAccessibilityLabel}
          style={({ pressed }) => [
            styles.camera,
            pressed && { opacity: PRESSED_OPACITY },
          ]}
        >
          <Icon
            name="camera"
            size={CAMERA_ICON_SIZE}
            color={colors.text.primary}
            strokeWidth={2}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  camera: {
    position: 'absolute',
    right: CAMERA_OFFSET,
    bottom: CAMERA_OFFSET,
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: CAMERA_BORDER_WIDTH,
    borderColor: colors.bg.base,
    borderRadius: radius.full,
    backgroundColor: colors.action.secondary,
  },
});

export type {
  AvatarProps,
  AvatarSize,
  AvatarVariant,
  StoreAvatarSize,
} from '@/components/Avatar/types';
