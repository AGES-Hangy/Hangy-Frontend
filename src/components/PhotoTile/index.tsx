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
 * Métricas por variante — seção PhotoTile da página Components do Figma:
 * Default preenche a coluna (`aspectRatio: 1`, sem raio) em vez de um lado
 * fixo — o 120×120 do frame é só o resultado da largura de tela de
 * referência; a largura real vem do layout, ver `PHOTO_GRID_COLUMNS` abaixo.
 * Expanded é 244×244 com raio md, Cover é 393×237 com a largura fluida
 * ("largura fluida × 237" na descrição do componente no Figma — o 393 do
 * frame também é só a largura da tela de referência).
 *
 * `placeholderIcon` é o lado do `Icon/image` do placeholder em cada variante
 * (29 / 37 / 40 no Figma). O traço do ícone continua 2 em qualquer tamanho no
 * Figma, por isso ele é renderizado com `absoluteStrokeWidth`.
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
 * Colunas e gap da grade de 3 colunas do Figma. `PhotoTile` no `Default`
 * ocupa `flex: 1` dentro da coluna — a largura fixa não é tarefa do
 * componente, é de quem monta o `FlatList`/grade:
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

/** Overlay escuro do State=Expanded — 35% de color/bg/inverse no Figma. */
const OVERLAY_OPACITY = 0.35;

/**
 * Círculo branco com o `Icon/camera` ao centro do State=Expanded — mesmo
 * diâmetro do `IconButton` MD, não coincidência: reaproveita a métrica em vez
 * de manter duas fontes de verdade para o mesmo círculo.
 */
const CAMERA_BADGE_SIZE = ICON_BUTTON_SIZES.MD.diameter;
const CAMERA_ICON_SIZE = 18;

/**
 * Tile da galeria de fotos do evento — componente compartilhado do Design
 * System (seção PhotoTile da página Components do Figma).
 *
 * Pensado para uma grade de 3 colunas com gap 4 e tiles encostados: o
 * `Default` não tem raio de propósito, é o que faz o mosaico funcionar. Sem
 * curtir e sem comentar — é registro, não rede social.
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
  // `SIZES[state]` infers the narrow per-variant literal type, not
  // `TileMetrics` — `satisfies` only checks compatibility, it doesn't widen.
  // Annotating here (safe, since `satisfies` already proved it) keeps
  // `metrics.height`/`metrics.aspectRatio` accessible for every variant.
  const metrics: TileMetrics = SIZES[state];
  const isPressable = onPress !== undefined;
  const [loadFailed, setLoadFailed] = useState(false);

  // Se a uri muda (ex.: troca de foto no mesmo tile), a falha anterior não
  // deve grudar na foto nova.
  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  const showImage = uri !== undefined && !loadFailed;
  // No Expanded vazio o frame do Figma mostra só o badge de câmera — o ícone
  // de placeholder por baixo do overlay escuro ficava quase invisível e
  // duplicava a mensagem "sem foto".
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
          // Placeholder das três variantes no Figma: o fundo primary/200 do
          // tile com o Icon/image centralizado em primary/400. Também cai
          // aqui quando a foto existe mas falha ao carregar (offline, 404,
          // token expirado) — melhor um placeholder claro que um retângulo
          // vazio parecido, mas sem o ícone.
          <Icon
            name="image"
            size={metrics.placeholderIcon}
            color={palette.primary[400]}
            absoluteStrokeWidth
          />
        )
      )}

      {state === 'Expanded' && (
        // Overlay e badge são camadas visuais, não alvos de toque próprios —
        // hoje o tile inteiro dispara `onPress`. Se o design confirmar que o
        // badge deve abrir a câmera por si só, ele precisa virar um
        // Pressable com accessibilityLabel próprio.
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
    // O botão de remover é irmão do tile, não filho: aninhar um Pressable com
    // papel de botão dentro do outro vira <button> dentro de <button> no web
    // (HTML inválido, e o leitor de tela anuncia os dois juntos). Esta View só
    // dá o tamanho da variante e serve de âncora para o posicionamento.
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
        // Sem onPress, um Pressable ainda vira nó focável em leitor de tela
        // por causa do accessibilityRole — uma View simples é semanticamente
        // mais honesta e poupa uma parada de navegação a mais.
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
