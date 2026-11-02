import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';

import { Icon } from '@/components/Icon';
import { ICON_BUTTON_SIZES, IconButton } from '@/components/IconButton';
import type { IconButtonSize } from '@/components/IconButton';
import type { PhotoTileProps, PhotoTileState } from '@/components/PhotoTile/types';
import { colors, palette } from '@/constants/colors';
import { pressedOpacity, radius, spacing } from '@/constants/layout';

type TileMetrics = {
  width: DimensionValue;
  height?: number;
  aspectRatio?: number;
  borderRadius: number;
  placeholderIcon: number;
  removeSize: IconButtonSize;
};

/**
 * Métricas da seção PhotoTile na página Components do Figma.
 * Default é quadrado, sem raio, e preenche a coluna da grade. Cover tem
 * largura fluida e altura 237; Expanded mede 244×244, com raio md.
 * Os frames de 120×120 (Default) e 393×237 (Cover) usam a largura da tela
 * de referência. A grade usa `PHOTO_GRID_COLUMNS`.
 *
 * `placeholderIcon` define o lado do `Icon/image` (29 / 37 / 40).
 * `absoluteStrokeWidth` mantém o traço em 2 nos três tamanhos.
 */
const SIZES = {
  Default: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 0,
    placeholderIcon: 29,
    removeSize: 'SM',
  },
  Expanded: {
    width: 244,
    height: 244,
    borderRadius: radius.md,
    placeholderIcon: 37,
    removeSize: 'MD',
  },
  Cover: {
    width: '100%',
    height: 237,
    borderRadius: 0,
    placeholderIcon: 40,
    removeSize: 'MD',
  },
} as const satisfies Record<PhotoTileState, TileMetrics>;

/**
 * Grade de 3 colunas do Figma. O layout da `FlatList` define a largura de
 * cada coluna, e o `PhotoTile` Default a preenche com `flex: 1`:
 *
 * ```tsx
 * <FlatList
 *   numColumns={PHOTO_GRID_COLUMNS}
 *   columnWrapperStyle={{ gap: PHOTO_GRID_GAP }}
 *   contentContainerStyle={{ gap: PHOTO_GRID_GAP }}
 *   renderItem={({ item }) => (
 *     <PhotoTile uri={item.uri} accessibilityLabel="Foto do evento" style={{ flex: 1 }} />
 *   )}
 * />
 * ```
 */
export const PHOTO_GRID_COLUMNS = 3;
export const PHOTO_GRID_GAP = spacing[4];

/** Overlay do State=Expanded: 35% de color/bg/inverse no Figma. */
const OVERLAY_OPACITY = 0.35;

/**
 * O círculo branco do `Icon/camera` no State=Expanded usa o diâmetro do
 * `IconButton` MD.
 */
const CAMERA_BADGE_SIZE = ICON_BUTTON_SIZES.MD.diameter;
const CAMERA_ICON_SIZE = 18;

/**
 * Foto da galeria do evento (seção PhotoTile da página Components do Figma).
 *
 * A variante Default compõe um mosaico de 3 colunas, gap 4 e cantos retos.
 *
 * ```tsx
 * <PhotoTile uri={foto.uri} accessibilityLabel="Foto do evento" onPress={abrirEmTelaCheia} />
 * <PhotoTile state="Cover" uri={evento.capa} accessibilityLabel="Capa do evento" />
 * <PhotoTile state="Expanded" uri={foto.uri} accessibilityLabel="Foto do evento" onRemove={removerFoto} />
 * ```
 */
export function PhotoTile({
  state = 'Default',
  uri,
  onPress,
  onRemove,
  accessibilityLabel,
  removeAccessibilityLabel = 'Remover foto',
  style,
}: PhotoTileProps) {
  // `satisfies` preserva os tipos literais de cada variante. A anotação permite
  // acessar `height` e `aspectRatio`, opcionais em `TileMetrics`.
  const metrics: TileMetrics = SIZES[state];
  const isPressable = onPress !== undefined;
  const [loadFailed, setLoadFailed] = useState(false);

  // Uma nova URI permite tentar carregar outra foto no mesmo tile.
  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  const showImage = uri !== undefined && !loadFailed;
  // No Expanded vazio, o badge de câmera já indica a ausência de foto.
  const showPlaceholderIcon = !showImage && state !== 'Expanded';

  const content = (
    <>
      {showImage ? (
        <Image
          source={{ uri }}
          recyclingKey={uri}
          transition={150}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        showPlaceholderIcon && (
          // O placeholder também cobre falhas de carregamento, como falta de
          // conexão, 404 ou token expirado. Cores do Figma: fundo primary/200
          // e Icon/image centralizado em primary/400.
          <Icon
            name="image"
            size={metrics.placeholderIcon}
            color={palette.primary[400]}
            absoluteStrokeWidth
          />
        )
      )}

      {state === 'Expanded' && (
        // Overlay e badge são decorativos; o toque é tratado pelo tile.
        <View style={styles.expandedLayer}>
          <View style={styles.overlay} />
          <View style={styles.cameraBadge}>
            <Icon
              name="camera"
              size={CAMERA_ICON_SIZE}
              color={palette.primary[600]}
              absoluteStrokeWidth
            />
          </View>
        </View>
      )}
    </>
  );

  return (
    // Remover e abrir a foto usam alvos irmãos para evitar botões HTML
    // aninhados e anúncios juntos no leitor de tela. A View define o tamanho
    // da variante e ancora o posicionamento do botão de remover.
    <View
      style={[
        { width: metrics.width, height: metrics.height, aspectRatio: metrics.aspectRatio },
        style,
      ]}
    >
      {isPressable ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.tile,
            { borderRadius: metrics.borderRadius },
            pressed && { opacity: pressedOpacity },
          ]}
        >
          {content}
        </Pressable>
      ) : (
        // Sem onPress, a foto é anunciada como imagem, sem um botão inativo.
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
          style={[styles.tile, { borderRadius: metrics.borderRadius }]}
        >
          {content}
        </View>
      )}

      {onRemove && (
        <IconButton
          icon="trash-2"
          accessibilityLabel={removeAccessibilityLabel}
          variant="Tonal"
          size={metrics.removeSize}
          onPress={onRemove}
          style={styles.removeButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  expandedLayer: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.inverse,
    opacity: OVERLAY_OPACITY,
  },
  cameraBadge: {
    width: CAMERA_BADGE_SIZE,
    height: CAMERA_BADGE_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
  },
});

export type { PhotoTileProps, PhotoTileState } from '@/components/PhotoTile/types';
