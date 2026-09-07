import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { EventPrivacy } from '@/types/event';

/**
 * # Placeholders — apagar quando os componentes reais entrarem no `develop`
 *
 * As telas de evento precisam de seis componentes do Design System que ainda
 * não foram mergeados. Em vez de bloquear a task, cada um tem aqui uma versão
 * mínima com **a mesma API pública** que a versão real vai expor, desenhada a
 * partir do mesmo frame do Figma.
 *
 * | Componente         | Task | Situação                                  |
 * | ------------------ | ---- | ----------------------------------------- |
 * | `Avatar`           | 149  | em revisão                                |
 * | `Badge`            | 161  | em revisão                                |
 * | `EventCard`        | 144  | em revisão                                |
 * | `PhotoTile`        | 162  | em revisão (PR #26)                       |
 * | `SectionHeader`    | 145  | em revisão                                |
 * | `NotificationItem` | 157  | ainda não começou — sprint futura         |
 *
 * ## Como trocar pelo componente real
 *
 * As telas importam tudo daqui em uma linha só:
 *
 * ```tsx
 * import { Avatar, Badge, EventCard } from '@/components/_placeholders';
 * ```
 *
 * Quando um componente real chegar, troque só o import daquele nome:
 *
 * ```tsx
 * import { Avatar } from '@/components/Avatar';
 * import { Badge, EventCard } from '@/components/_placeholders';
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
/* Avatar — task 149                                                          */
/* -------------------------------------------------------------------------- */

export type AvatarSize = 'SM' | 'MD' | 'LG';
export type AvatarType = 'Person' | 'Business';

export type AvatarProps = {
  size?: AvatarSize;
  /** Pessoa é círculo; estabelecimento é quadrado com raio md. */
  type?: AvatarType;
  uri?: string | null;
  accessibilityLabel?: string;
};

/** Diâmetros do Figma. O ícone é sempre metade do diâmetro. */
const AVATAR_SIZES: Record<AvatarSize, number> = { SM: 32, MD: 40, LG: 56 };

export function Avatar({ size = 'MD', type = 'Person', uri, accessibilityLabel }: AvatarProps) {
  const diameter = AVATAR_SIZES[size];
  const shape = type === 'Person' ? radius.full : radius.md;

  return (
    <View
      style={[styles.avatar, { width: diameter, height: diameter, borderRadius: shape }]}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Icon
          name={type === 'Person' ? 'user' : 'store'}
          size={diameter / 2}
          color={palette.primary[400]}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge — task 161                                                           */
/* -------------------------------------------------------------------------- */

export type BadgeProps = {
  privacy: EventPrivacy;
};

/**
 * O Figma só especifica a variante `Por convite` (fundo secondary/50, borda e
 * texto secondary/700, ícone ticket). Público e privado seguem a mesma forma
 * com os tokens neutros — **conferir com design** quando a task 161 entrar.
 */
const PRIVACY_BADGE: Record<
  EventPrivacy,
  { label: string; icon: IconName; background: string; foreground: string }
> = {
  PUBLIC: {
    label: 'Público',
    icon: 'users',
    background: palette.primary[50],
    foreground: palette.primary[700],
  },
  PRIVATE: {
    label: 'Privado',
    icon: 'lock',
    background: palette.primary[50],
    foreground: palette.primary[700],
  },
  INVITE_ONLY: {
    label: 'Por convite',
    icon: 'ticket',
    background: palette.secondary[50],
    foreground: palette.secondary[700],
  },
};

/** Lado do ícone dentro do badge — 12 no Figma. */
const BADGE_ICON_SIZE = 12;

export function Badge({ privacy }: BadgeProps) {
  const visual = PRIVACY_BADGE[privacy];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: visual.background, borderColor: visual.foreground },
      ]}
    >
      <Icon name={visual.icon} size={BADGE_ICON_SIZE} color={visual.foreground} absoluteStrokeWidth />
      <Text style={[styles.badgeLabel, { color: visual.foreground }]}>{visual.label}</Text>
    </View>
  );
}

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
/* SectionHeader — task 145                                                   */
/* -------------------------------------------------------------------------- */

export type SectionHeaderProps = {
  title: string;
  /** `Overline` é caixa alta e tercíaria; `Title` é H3 primário. */
  variant?: 'Overline' | 'Title';
  /** Mostra o link "Ver todos" à direita. */
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({
  title,
  variant = 'Overline',
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      {/* O conteúdo já vem em caixa alta: o Figma pede para não aplicar
          transformação de texto no código. */}
      <Text
        style={variant === 'Overline' ? styles.sectionOverline : styles.sectionTitle}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {actionLabel && (
        <Pressable
          onPress={onActionPress}
          hitSlop={spacing[8]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionLabel}>{actionLabel}</Text>
          <Icon name="chevron-right" size={18} color={colors.text.brand} />
        </Pressable>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* EventCard — task 144                                                       */
/* -------------------------------------------------------------------------- */

export type EventCardProps = {
  /** Só `Compact` (h88) está implementada aqui — é a que a tela usa. */
  variant?: 'Featured' | 'Compact' | 'MapPreview';
  title: string;
  /** Linha de data · hora · local. */
  subtitle: string;
  coverUri?: string | null;
  privacy?: EventPrivacy;
  onPress?: () => void;
};

/** Lado da miniatura do Compact — 72 no Figma. */
const EVENT_CARD_THUMB = 72;

export function EventCard({ title, subtitle, coverUri, privacy, onPress }: EventCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${title}. ${subtitle}` : undefined}
      style={styles.eventCard}
    >
      <View style={styles.eventCardThumb}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name="image" size={24} color={palette.primary[400]} absoluteStrokeWidth />
        )}
      </View>

      <View style={styles.eventCardBody}>
        <Text style={styles.eventCardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.eventCardSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {privacy && <Badge privacy={privacy} />}
      </View>

      {onPress && <Icon name="chevron-right" size={20} color={colors.text.tertiary} />}
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

/* -------------------------------------------------------------------------- */
/* Item de participante — não é componente do DS, é linha da lista            */
/* -------------------------------------------------------------------------- */

export type ParticipantRowProps = {
  name: string;
  avatarUri?: string | null;
  /** Sem isto a linha não mostra o botão de remover. */
  onRemove?: () => void;
  onPress?: () => void;
  removeDisabled?: boolean;
};

export function ParticipantRow({
  name,
  avatarUri,
  onRemove,
  onPress,
  removeDisabled = false,
}: ParticipantRowProps) {
  return (
    <View style={styles.participantRow}>
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Abrir perfil de ${name}` : undefined}
        style={styles.participantMain}
      >
        <Avatar uri={avatarUri} />
        <Text style={styles.participantName} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>

      {onRemove && (
        <IconButton
          icon="x"
          size="SM"
          variant="Ghost"
          onPress={onRemove}
          disabled={removeDisabled}
          accessibilityLabel={`Remover ${name} do evento`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[4],
    height: 24,
    paddingHorizontal: spacing[8],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeLabel: {
    // O Figma usa Hangy/Label XS (11/15 w600), que ainda não existe na escala
    // de `@/constants/typography` — `caption` é o vizinho mais próximo.
    ...typography.caption,
    fontWeight: '600',
  },

  cover: {
    width: '100%',
    height: COVER_HEIGHT,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing[12],
  },
  sectionOverline: {
    ...typography.overline,
    color: colors.text.tertiary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  sectionActionLabel: {
    ...typography.labelM,
    color: colors.text.brand,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    height: 88,
    padding: spacing[8],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  eventCardThumb: {
    width: EVENT_CARD_THUMB,
    height: EVENT_CARD_THUMB,
    borderRadius: radius.sm,
    backgroundColor: palette.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eventCardBody: {
    flex: 1,
    gap: spacing[4],
  },
  eventCardTitle: {
    ...typography.labelL,
    color: colors.text.primary,
  },
  eventCardSubtitle: {
    ...typography.bodyS,
    color: colors.text.secondary,
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

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  participantMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  participantName: {
    flex: 1,
    ...typography.labelM,
    color: colors.text.primary,
  },
});
