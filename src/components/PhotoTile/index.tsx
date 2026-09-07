import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import type { IconButtonSize } from '@/components/IconButton';
import type { PhotoTileProps, PhotoTileState } from '@/components/PhotoTile/types';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';

type TileMetrics = {
  width: DimensionValue;
  height: number;
  borderRadius: number;
  placeholderIcon: number;
  removeSize: IconButtonSize;
};

/**
 * Métricas por variante — seção PhotoTile da página Components do Figma:
 * Default 120×120 (tile da grade, sem raio), Expanded 244×244 com raio md,
 * Cover 393×237 com a largura fluida ("largura fluida × 237" na descrição do
 * componente no Figma — o 393 do frame é só a largura da tela de referência).
 *
 * `placeholderIcon` é o lado do `Icon/image` do placeholder em cada variante
 * (29 / 37 / 40 no Figma). O traço do ícone continua 2 em qualquer tamanho no
 * Figma, por isso ele é renderizado com `absoluteStrokeWidth`.
 */
const SIZES = {
  Default: {
    width: 120,
    height: 120,
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

/** Overlay escuro do State=Expanded — 35% de color/bg/inverse no Figma. */
const OVERLAY_OPACITY = 0.35;

/** Círculo branco com o `Icon/camera` ao centro do State=Expanded. */
const CAMERA_BADGE_SIZE = 44;
const CAMERA_ICON_SIZE = 18;

/**
 * Opacidade ao pressionar, igual a `Button` e `IconButton`. O Figma ainda não
 * especifica o estado Pressed do PhotoTile; quando especificar, troque por token.
 */
const PRESSED_OPACITY = 0.85;

/**
 * Tile da galeria de fotos do evento — componente compartilhado do Design
 * System (seção PhotoTile da página Components do Figma).
 *
 * Pensado para uma grade de 3 colunas com gap 4 e tiles encostados: o
 * `Default` não tem raio de propósito, é o que faz o mosaico funcionar. Sem
 * curtir e sem comentar — é registro, não rede social.
 *
 * ```tsx
 * <PhotoTile uri={foto.uri} onPress={abrirEmTelaCheia} />
 * <PhotoTile state="Cover" uri={evento.capa} />
 * <PhotoTile state="Expanded" uri={foto.uri} onRemove={removerFoto} />
 * ```
 */
export function PhotoTile({
  state = 'Default',
  uri,
  onPress,
  onRemove,
  accessibilityLabel = 'Foto do evento',
  removeAccessibilityLabel = 'Remover foto',
  style,
}: PhotoTileProps) {
  const metrics = SIZES[state];
  const isPressable = onPress !== undefined;

  return (
    // O botão de remover é irmão do tile, não filho: aninhar um Pressable com
    // papel de botão dentro do outro vira <button> dentro de <button> no web
    // (HTML inválido, e o leitor de tela anuncia os dois juntos). Esta View só
    // dá o tamanho da variante e serve de âncora para o posicionamento.
    <View style={[{ width: metrics.width, height: metrics.height }, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole={isPressable ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.tile,
          { borderRadius: metrics.borderRadius },
          pressed && isPressable && { opacity: PRESSED_OPACITY },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          // Placeholder das três variantes no Figma: o fundo primary/200 do
          // tile com o Icon/image centralizado em primary/400.
          <Icon
            name="image"
            size={metrics.placeholderIcon}
            color={palette.primary[400]}
            absoluteStrokeWidth
          />
        )}

        {state === 'Expanded' && (
          // Overlay e badge são camadas visuais da variante, não alvos de
          // toque — daí o `pointerEvents: 'none'` no estilo: quem recebe o
          // toque é o Pressable do tile inteiro.
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
      </Pressable>

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
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
