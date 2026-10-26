import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/Dialog';
import { ExperienceDescriptionDialog } from '@/components/ExperienceDescriptionDialog';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type { PhotoViewerItem, PhotoViewerProps } from '@/components/PhotoViewer/types';
import { palette } from '@/constants/colors';
import { pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { formatDate } from '@/utils/datetime';
import { withAlpha } from '@/utils/color';

/** Fundo da foto: o `bg/inverse` quase preto, sem competir com a imagem. */
const BACKDROP = palette.neutral[950];
/** Véu dos botões e do rodapé por cima da foto. */
const SCRIM = withAlpha(palette.neutral[950], 0.62);
/** Lado do botão circular do topo, com o alvo de toque de 44 do DS. */
const CHROME_BUTTON_SIZE = 44;
/** Linhas da descrição antes do "Ver mais". */
const DESCRIPTION_LINES = 3;

export type { PhotoViewerItem, PhotoViewerProps } from '@/components/PhotoViewer/types';

/**
 * Foto em tela cheia, com as fotos vizinhas a um deslize de distância: o
 * título (evento), a data e a descrição da experiência ficam num rodapé por
 * cima da foto, e a lixeira no topo quando a pessoa pode excluir. Um toque na
 * foto esconde e mostra essa moldura.
 */
export function PhotoViewer({
  initialIndex, photos, onClose, onDelete, onEditDescription, onPressTitle,
}: PhotoViewerProps) {
  const visible = initialIndex !== null && photos.length > 0;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<PhotoViewerItem>>(null);
  const [index, setIndex] = useState(initialIndex ?? 0);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoViewerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<PhotoViewerItem | null>(null);
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Cada abertura começa na foto tocada e com a moldura à mostra.
  useEffect(() => {
    if (initialIndex === null) return;
    setIndex(initialIndex);
    setIsChromeVisible(true);
    setIsDescriptionExpanded(false);
  }, [initialIndex]);

  // A exclusão encolhe a lista: o índice fica na foto seguinte (ou na última),
  // e sem nenhuma foto o visualizador fecha.
  useEffect(() => {
    if (initialIndex === null) return;
    if (photos.length === 0) {
      onClose();
      return;
    }
    if (index > photos.length - 1) setIndex(photos.length - 1);
  }, [index, initialIndex, onClose, photos.length]);

  const current = photos[Math.min(index, photos.length - 1)];

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index && next >= 0 && next < photos.length) {
        setIndex(next);
        setIsDescriptionExpanded(false);
      }
    },
    [index, photos.length, width],
  );

  async function confirmDelete() {
    const photo = photoToDelete;
    if (!photo || !onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(photo);
    } finally {
      setIsDeleting(false);
      setPhotoToDelete(null);
    }
  }

  async function saveDescription(description: string) {
    const photo = photoToEdit;
    if (!photo || !onEditDescription || isSavingDescription) return;
    setIsSavingDescription(true);
    try {
      if (await onEditDescription(photo, description)) setPhotoToEdit(null);
    } finally {
      setIsSavingDescription(false);
    }
  }

  if (!current) return null;

  const title = current.title?.trim() || null;
  const description = current.description?.trim() || null;
  const date = current.createdAt ? formatDate(current.createdAt) : '';
  const position = `${Math.min(index, photos.length - 1) + 1} de ${photos.length}`;
  const canDelete = onDelete !== undefined && current.canDelete === true;
  const canEditDescription = onEditDescription !== undefined && current.canEditDescription === true;
  const hasFooter = title !== null || description !== null || date !== '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar style="light" />
      <View style={styles.screen} accessibilityViewIsModal>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(photo) => photo.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex ?? 0, Math.max(photos.length - 1, 0))}
          getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index: itemIndex }) => (
            <Pressable
              onPress={() => setIsChromeVisible((shown) => !shown)}
              style={{ width, height }}
              accessibilityRole="image"
              accessibilityLabel={`Foto ${itemIndex + 1} de ${photos.length}${item.title ? `, ${item.title}` : ''}`}
              accessibilityHint={isChromeVisible ? 'Toque para esconder os detalhes' : 'Toque para mostrar os detalhes'}
            >
              <Image
                source={{ uri: item.uri }}
                recyclingKey={item.uri}
                transition={200}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
              />
            </Pressable>
          )}
        />

        {isChromeVisible && (
          <View style={[styles.topBar, { paddingTop: insets.top + spacing[8] }]} pointerEvents="box-none">
            <ChromeButton icon="x" accessibilityLabel="Fechar foto" onPress={onClose} />
            {photos.length > 1 ? (
              <View style={styles.counter}>
                <Text style={styles.counterText} accessibilityLabel={`Foto ${position}`}>
                  {position}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.actions}>
              {canEditDescription && (
                <ChromeButton
                  icon="pencil"
                  accessibilityLabel="Editar descrição"
                  onPress={() => setPhotoToEdit(current)}
                />
              )}
              {canDelete ? (
                <ChromeButton
                  icon="trash-2"
                  accessibilityLabel="Excluir foto"
                  onPress={() => setPhotoToDelete(current)}
                  tone="danger"
                />
              ) : (
                !canEditDescription && <View style={styles.chromeSpacer} />
              )}
            </View>
          </View>
        )}

        {isChromeVisible && hasFooter && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[16] }]}>
            {title && (
              <Pressable
                onPress={onPressTitle ? () => onPressTitle(current) : undefined}
                disabled={!onPressTitle}
                accessibilityRole={onPressTitle ? 'link' : 'text'}
                accessibilityLabel={onPressTitle ? `${title}, abrir evento` : title}
                style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}
                hitSlop={spacing[8]}
              >
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
                {onPressTitle && <Icon name="chevron-right" size={18} color={palette.neutral[300]} />}
              </Pressable>
            )}
            {date !== '' && <Text style={styles.date}>Publicada em {date}</Text>}
            {description && (
              <Pressable
                onPress={() => setIsDescriptionExpanded((expanded) => !expanded)}
                accessibilityRole="button"
                accessibilityLabel={description}
                accessibilityHint={isDescriptionExpanded ? 'Toque para recolher' : 'Toque para ler tudo'}
              >
                <Text
                  style={styles.description}
                  numberOfLines={isDescriptionExpanded ? undefined : DESCRIPTION_LINES}
                >
                  {description}
                </Text>
                {!isDescriptionExpanded && description.length > 120 && (
                  <Text style={styles.more}>Ver mais</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Dentro do `Modal` do visualizador: no iOS, um `Modal` irmão não abre por cima. */}
        <Dialog
          visible={photoToDelete !== null}
          variant="DeleteEvent"
          title="Excluir foto?"
          description="A foto deixa de aparecer no evento e no perfil. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!isDeleting) setPhotoToDelete(null);
          }}
          isLoading={isDeleting}
        />
        <ExperienceDescriptionDialog
          visible={photoToEdit !== null}
          mode="edit"
          initialValue={photoToEdit?.description ?? ''}
          onConfirm={(description) => void saveDescription(description)}
          onCancel={() => {
            if (!isSavingDescription) setPhotoToEdit(null);
          }}
          isLoading={isSavingDescription}
        />
      </View>
    </Modal>
  );
}

function ChromeButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'default',
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.chromeButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={tone === 'danger' ? palette.error.border : palette.neutral[0]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKDROP,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
  },
  chromeButton: {
    width: CHROME_BUTTON_SIZE,
    height: CHROME_BUTTON_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SCRIM,
  },
  chromeSpacer: {
    width: CHROME_BUTTON_SIZE,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  counter: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    backgroundColor: SCRIM,
  },
  counterText: {
    ...typography.labelS,
    color: palette.neutral[0],
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing[4],
    paddingTop: spacing[20],
    paddingHorizontal: spacing[20],
    backgroundColor: SCRIM,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    alignSelf: 'flex-start',
  },
  title: {
    ...typography.labelL,
    color: palette.neutral[0],
    flexShrink: 1,
  },
  date: {
    ...typography.bodyS,
    color: palette.neutral[300],
  },
  description: {
    ...typography.bodyM,
    color: palette.neutral[100],
    paddingTop: spacing[8],
  },
  more: {
    ...typography.labelS,
    color: palette.primary[200],
    paddingTop: spacing[4],
  },
  pressed: {
    opacity: pressedOpacity,
  },
});
