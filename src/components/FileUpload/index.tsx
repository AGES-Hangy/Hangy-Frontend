import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';

import { IconButton } from '@/components/IconButton';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, typography } from '@/constants/typography';
import type { FileUploadProps } from '@/components/FileUpload/types';

/** Body S dos textos da dropzone — família + tamanho + peso + altura de linha juntos. */
const bodyS = {
  fontFamily: fontFamily.base,
  fontSize: typography.bodyS.fontSize,
  lineHeight: typography.bodyS.lineHeight,
  fontWeight: typography.bodyS.fontWeight,
  letterSpacing: typography.bodyS.letterSpacing,
} as const;

const labelM = {
  fontFamily: fontFamily.base,
  fontSize: typography.labelM.fontSize,
  lineHeight: typography.labelM.lineHeight,
  fontWeight: typography.labelM.fontWeight,
  letterSpacing: typography.labelM.letterSpacing,
} as const;

/** Frame de referência do Figma — dropzone 340×107. Usado só para manter a proporção. */
const ASPECT_RATIO = 340 / 107;
const BORDER_DASH = '3,3';

type State = 'empty' | 'uploading' | 'filled' | 'error';

function resolveState({ value, progress, error }: FileUploadProps): State {
  if (error) return 'error';
  if (progress !== undefined) return 'uploading';
  if (value) return 'filled';
  return 'empty';
}

/**
 * Área de envio da capa de um evento — componente compartilhado do Design
 * System (seção FileUpload da página Components do Figma). Genérico: não
 * sabe nada sobre US3.1/US3.3, quem chama decide o que fazer em cada evento.
 *
 * `borderStyle: 'dashed'` não é confiável no Android, então a borda
 * tracejada é desenhada com `react-native-svg` sobreposta ao fundo.
 *
 * ```tsx
 * <FileUpload value={cover} onPick={pickImage} onRemove={clearCover} />
 * ```
 */
export function FileUpload({
  label = 'Capa',
  badge = 'Opcional',
  value = null,
  progress,
  error,
  onPick,
  onRemove,
  onCancel,
}: FileUploadProps) {
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const state = resolveState({ value, progress, error });

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setBoxSize({ width, height });
  }

  const isInteractive = state === 'empty' || state === 'error';

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.badge}>{badge}</Text>
      </View>

      {/*
        Sem accessibilityRole/Label aqui: no estado empty/error o IconButton
        logo abaixo já é o botão semântico "Adicionar foto de capa". Dar role
        de botão pros dois aninhava um <button> dentro do outro (HTML
        inválido, leitor de tela duplicado) — este Pressable só amplia a área
        de toque, o IconButton é quem carrega o rótulo.
        Sem `disabled` também: no web ele aplica `pointer-events: none` na
        View inteira, o que bloqueava o toque no IconButton de remover/
        cancelar aninhado nos estados Filled/Uploading. `onPress` undefined
        já é suficiente pra não reagir ao toque quando não é interativo.
      */}
      <Pressable
        onPress={isInteractive ? onPick : undefined}
        onLayout={handleLayout}
        style={[
          styles.box,
          { backgroundColor: state === 'error' ? palette.error.bg : palette.neutral[200] },
        ]}
      >
        {boxSize.width > 0 && (
          <Svg
            style={StyleSheet.absoluteFill}
            width={boxSize.width}
            height={boxSize.height}
            pointerEvents="none"
          >
            <Rect
              x={0.5}
              y={0.5}
              width={boxSize.width - 1}
              height={boxSize.height - 1}
              rx={radius.dropzone}
              ry={radius.dropzone}
              fill="none"
              stroke={state === 'error' ? colors.feedback.error : colors.border.strong}
              strokeWidth={1}
              strokeDasharray={BORDER_DASH}
            />
          </Svg>
        )}

        {state === 'empty' && (
          <View style={styles.content}>
            <IconButton
              icon="share"
              accessibilityLabel="Adicionar foto de capa"
              variant="Tonal"
              size="MD"
              onPress={onPick}
            />
            <Text style={styles.bodyText}>Adicione uma foto de capa para o evento</Text>
            <Text style={styles.bodyTextMuted}>JPG ou PNG até 5 MB · 16:9</Text>
          </View>
        )}

        {state === 'uploading' && (
          <>
            <View style={styles.content}>
              <Text style={styles.bodyText}>Enviando · {progress ?? 0}%</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress ?? 0}%` }]} />
              </View>
            </View>
            <IconButton
              icon="x"
              accessibilityLabel="Cancelar envio"
              variant="Ghost"
              size="SM"
              onPress={onCancel}
              style={styles.cancelButton}
            />
          </>
        )}

        {state === 'filled' && value && (
          <>
            <Image
              source={{ uri: value.uri }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.dropzone }]}
              contentFit="cover"
            />
            <IconButton
              icon="trash-2"
              accessibilityLabel="Remover capa"
              variant="Tonal"
              size="MD"
              onPress={onRemove}
              style={styles.removeButton}
            />
          </>
        )}

        {state === 'error' && (
          <View style={styles.content}>
            <IconButton
              icon="share"
              accessibilityLabel="Adicionar foto de capa"
              variant="Tonal"
              size="MD"
              onPress={onPick}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  label: {
    ...labelM,
    color: colors.text.primary,
  },
  badge: {
    ...bodyS,
    color: colors.text.tertiary,
  },
  box: {
    width: '100%',
    aspectRatio: ASPECT_RATIO,
    borderRadius: radius.dropzone,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
  },
  bodyText: {
    ...bodyS,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  bodyTextMuted: {
    ...bodyS,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  errorText: {
    ...bodyS,
    color: colors.feedback.error,
    textAlign: 'center',
  },
  progressTrack: {
    width: '60%',
    height: spacing[4],
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
  },
  cancelButton: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[8],
  },
  removeButton: {
    position: 'absolute',
    bottom: spacing[12],
    right: spacing[12],
  },
});

export type { FileUploadProps, FileUploadValue } from '@/components/FileUpload/types';
