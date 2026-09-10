import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * # Placeholders — apagar quando os componentes reais entrarem no `develop`
 *
 * As telas de evento precisam de componentes do Design System que ainda não
 * foram mergeados. Em vez de bloquear a task, cada um tem aqui uma versão
 * mínima com **a mesma API pública** que a versão real vai expor, desenhada a
 * partir do mesmo frame do Figma.
 *
 * | Componente         | Task | Situação                                  |
 * | ------------------ | ---- | ----------------------------------------- |
 * | `PhotoTile`        | 162  | em revisão (PR #26)                       |
 * | `NotificationItem` | 157  | ainda não começou — sprint futura         |
 *
 * `Avatar`, `Badge`, `EventCard` e `SectionHeader` já foram mergeados — as
 * telas importam esses direto de `@/components/<Nome>`.
 *
 * ## Como trocar pelo componente real
 *
 * As telas importam tudo daqui em uma linha só:
 *
 * ```tsx
 * import { NotificationItem, PhotoTile } from '@/components/_placeholders';
 * ```
 *
 * Quando um componente real chegar, troque só o import daquele nome:
 *
 * ```tsx
 * import { PhotoTile } from '@/components/PhotoTile';
 * import { NotificationItem } from '@/components/_placeholders';
 * ```
 *
 * e apague o bloco correspondente deste arquivo. Quando o último sair, a pasta
 * `_placeholders` inteira vai junto. O underscore no nome é o aviso de que
 * isto é temporário e não faz parte do Design System.
 *
 * O que **não** está aqui: variantes que estas telas não usam. O placeholder
 * cobre o que o frame pede, não o componente inteiro — a versão real é que
 * entrega todos os eixos.
 */

/* -------------------------------------------------------------------------- */
/* PhotoTile — task 162 (PR #26)                                              */
/* -------------------------------------------------------------------------- */

export type PhotoTileProps = {
  state?: 'Default' | 'Expanded' | 'Cover';
  uri?: string | null;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Só a variante `Cover` (largura fluida × 237), que é a que estas telas usam. */
const COVER_HEIGHT = 237;

export function PhotoTile({ uri, onPress, accessibilityLabel = 'Capa do evento' }: PhotoTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      style={styles.cover}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Icon name="image" size={40} color={palette.primary[400]} absoluteStrokeWidth />
      )}
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* NotificationItem — task 157 (sprint futura)                                */
/* -------------------------------------------------------------------------- */

export type NotificationItemProps = {
  /** Só `Request` está implementado — é o tipo que a gestão do evento usa. */
  type?: 'Request' | 'Activity' | 'Connection' | 'ConnectionGroup';
  title: string;
  subtitle: string;
  avatarUri?: string | null;
  /** Não lida ganha fundo primary/50 e o ponto de 8px à esquerda. */
  unread?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  /** `PATCH` em voo: spinner no card, sem congelar a lista. */
  isProcessing?: boolean;
  /** Evento lotado desabilita só o aprovar; recusar continua valendo. */
  approveDisabled?: boolean;
};

/** Lado do bloco da foto do solicitante — 48 no Figma, raio sm. */
const REQUEST_PHOTO_SIZE = 48;
const UNREAD_DOT_SIZE = 8;

export function NotificationItem({
  title,
  subtitle,
  avatarUri,
  unread = false,
  onApprove,
  onReject,
  isProcessing = false,
  approveDisabled = false,
}: NotificationItemProps) {
  return (
    <View style={[styles.notification, unread && styles.notificationUnread]}>
      {unread && <View style={styles.unreadDot} />}

      <View style={styles.requestPhoto}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name="user" size={REQUEST_PHOTO_SIZE / 2} color={palette.primary[400]} />
        )}
      </View>

      <View style={styles.notificationBody}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationSubtitle}>{subtitle}</Text>

        {(onApprove || onReject) && (
          <View style={styles.notificationActions}>
            {onReject && (
              <Button
                label="Recusar"
                variant="Secondary"
                size="SM"
                onPress={onReject}
                disabled={isProcessing}
                accessibilityLabel={`Recusar solicitação de ${title}`}
              />
            )}
            {onApprove && (
              <Button
                label="Aprovar"
                size="SM"
                onPress={onApprove}
                isLoading={isProcessing}
                disabled={approveDisabled}
                accessibilityLabel={`Aprovar solicitação de ${title}`}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  notificationUnread: {
    backgroundColor: palette.primary[50],
  },
  unreadDot: {
    width: UNREAD_DOT_SIZE,
    height: UNREAD_DOT_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.action.secondary,
  },
  requestPhoto: {
    width: REQUEST_PHOTO_SIZE,
    height: REQUEST_PHOTO_SIZE,
    borderRadius: radius.sm,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notificationBody: {
    flex: 1,
    gap: spacing[4],
  },
  notificationTitle: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  notificationSubtitle: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[4],
  },
});
