import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BadgeModeration, resolveModerationVariant } from '@/components/BadgeModeration';
import { Icon } from '@/components/Icon';
import type { ReportCardProps, ReportCardTarget } from '@/components/ReportCard/types';
import { colors, palette } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const metrics = layout.reportCard;
/**
 * No Figma a borda de 1px fica por dentro e o padding de 12 conta a partir da
 * borda externa. No React Native o padding começa depois da borda.
 */
const CARD_PADDING = spacing[12] - metrics.borderWidth;

const THUMB = {
  Pessoa: { icon: 'user', backgroundColor: palette.primary[200] },
  Evento: { icon: 'calendar', backgroundColor: palette.primary[100] },
} as const satisfies Record<ReportCardTarget, { icon: 'user' | 'calendar'; backgroundColor: string }>;

/**
 * Avatar ou capa do evento. As duas variantes usam o mesmo círculo de 32: no
 * Figma a capa do evento só tem altura e sai achatada, então segue o avatar.
 */
function TargetThumb({ target, uri }: { target: ReportCardTarget; uri?: string | null }) {
  const [failed, setFailed] = useState(false);
  const thumb = THUMB[target];

  return (
    <View style={[styles.thumb, { backgroundColor: thumb.backgroundColor }]} aria-hidden>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : (
        <Icon name={thumb.icon} size={metrics.thumbIconSize} color={palette.primary[600]} />
      )}
    </View>
  );
}

/**
 * Item da fila de denúncias do painel administrativo.
 *
 * ```tsx
 * <ReportCard
 *   target="Pessoa"
 *   targetName="Lucas Ferreira"
 *   subtitle="3 denúncias · há 2 h"
 *   moderationStatus="EmAnalise"
 *   reason="Assédio ou discurso de ódio"
 *   descriptionExcerpt="Ele mandou mensagens ofensivas no chat do evento."
 *   reportNumber={1042}
 *   onPress={() => router.push(`/Admin/Denuncias/${id}`)}
 * />
 * ```
 */
export function ReportCard({
  target,
  targetName,
  targetImageUrl,
  subtitle,
  moderationStatus,
  reason,
  descriptionExcerpt,
  reportNumber,
  onPress,
}: ReportCardProps) {
  const statusLabel = resolveModerationVariant(moderationStatus).label;
  const accessibilityLabel = [
    `Denúncia #${reportNumber}`,
    `${target === 'Pessoa' ? 'Pessoa' : 'Evento'}: ${targetName}`,
    subtitle,
    statusLabel,
    `Motivo: ${reason}`,
    descriptionExcerpt,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && { opacity: pressedOpacity }]}
    >
      <View style={styles.header}>
        {/* A URI reinicia o fallback quando a imagem muda numa lista reciclada. */}
        <TargetThumb key={targetImageUrl ?? ''} target={target} uri={targetImageUrl} />
        <View style={styles.headerText}>
          <Text style={[typography.labelM, styles.title]} numberOfLines={1}>
            {targetName}
          </Text>
          {subtitle ? (
            <Text style={[typography.bodyS, styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <BadgeModeration value={moderationStatus} />
      </View>

      <View style={styles.reason}>
        <Icon name="flag" size={metrics.reasonIconSize} color={palette.error.default} />
        <Text style={[typography.labelS, styles.reasonText]} numberOfLines={1}>
          {reason}
        </Text>
      </View>

      <Text style={[typography.bodyS, styles.excerpt]} numberOfLines={2}>
        {`“${descriptionExcerpt}”`}
      </Text>

      <View style={styles.footer}>
        <Text style={[typography.bodyS, styles.reportNumber]}>Denúncia #{reportNumber}</Text>
        <Icon name="chevron-right" size={metrics.chevronSize} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: spacing[8],
    padding: CARD_PADDING,
    borderWidth: metrics.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  thumb: {
    width: metrics.thumbSize,
    height: metrics.thumbSize,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: metrics.titleGap,
  },
  title: {
    color: colors.text.primary,
  },
  subtitle: {
    color: colors.text.tertiary,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  reasonText: {
    flexShrink: 1,
    color: palette.error.default,
  },
  excerpt: {
    color: colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportNumber: {
    color: colors.text.tertiary,
  },
});

export type { ReportCardProps, ReportCardTarget } from '@/components/ReportCard/types';
