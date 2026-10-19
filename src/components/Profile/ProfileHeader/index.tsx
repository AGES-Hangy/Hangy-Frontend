import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import type { ProfileHeaderProps } from '@/components/Profile/ProfileHeader/types';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Divisor vertical entre os números do cabeçalho, 1 × 28 no frame. */
const STAT_DIVIDER_HEIGHT = 28;

/** O número com o rótulo tem ~44 de altura; o slot completa a área de toque nas laterais. */
const STAT_HIT_SLOP = { top: spacing[4], bottom: spacing[4], left: spacing[8], right: spacing[8] };
const PRESSED_OPACITY = 0.6;

const countFormatter = new Intl.NumberFormat('pt-BR');

/**
 * Cabeçalho das telas de perfil: avatar, números, nome, bio, tags e uma linha
 * de ações que a tela preenche.
 */
export function ProfileHeader({
  photoUrl,
  avatarVariant,
  stats,
  name,
  focusRef,
  description,
  tags,
  actions,
}: ProfileHeaderProps) {
  const avatarSource = photoUrl ? { uri: photoUrl } : undefined;
  const attachFocus = (node: View | Text | null) => {
    if (focusRef) focusRef.current = node;
  };

  return (
    <View ref={name ? undefined : attachFocus} style={styles.header}>
      <View style={styles.top}>
        {/* Decorativo: o nome vem logo abaixo e o leitor de tela não precisa anunciar a foto. */}
        {avatarVariant === 'Store' ? (
          <Avatar variant="Store" size="MD" source={avatarSource} />
        ) : (
          <Avatar size="MD" source={avatarSource} />
        )}

        {stats.length > 0 && (
          <View style={styles.stats}>
            {stats.map((stat, index) => {
              const value = countFormatter.format(stat.value);
              return (
                <Fragment key={stat.label}>
                  {index > 0 && (
                    <>
                      <View style={styles.statSpacer} />
                      <View style={styles.statDivider} />
                      <View style={styles.statSpacer} />
                    </>
                  )}
                  {stat.onPress ? (
                    <Pressable
                      onPress={stat.onPress}
                      hitSlop={STAT_HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={stat.accessibilityLabel ?? `${value} ${stat.label}`}
                      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
                    >
                      <Text style={styles.statValue}>{value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.stat} accessible accessibilityLabel={`${value} ${stat.label}`}>
                      <Text style={styles.statValue}>{value}</Text>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  )}
                </Fragment>
              );
            })}
          </View>
        )}
      </View>

      {(name || description) && (
        <View style={styles.identity}>
          {name && (
            <Text ref={attachFocus} style={styles.name} accessibilityRole="header">
              {name}
            </Text>
          )}
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}

      {tags.length > 0 && (
        // O `Chip` é sempre um botão. As tags aqui não são tocáveis, então o
        // grupo vira um único elemento para o leitor de tela e não recebe toque.
        <View
          style={styles.tags}
          accessible
          accessibilityLabel={`Interesses: ${tags.map((tag) => tag.name).join(', ')}`}
        >
          {tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} size="sm" categoryType="macro" isSelected />
          ))}
        </View>
      )}

      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing[12],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[20],
    paddingHorizontal: spacing[16],
  },
  // Nos frames, o bloco abraça os números e não se estica até a margem.
  stats: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // O vão de 24–26 entre número e divisor nos frames. É uma caixa, e não `gap`,
  // para encolher em telas estreitas em vez de empurrar o último número para fora.
  statSpacer: {
    width: spacing[24],
    flexShrink: 1,
  },
  stat: {
    alignItems: 'center',
    gap: spacing[4],
  },
  statPressed: {
    opacity: PRESSED_OPACITY,
  },
  statValue: {
    ...typography.h4,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: STAT_DIVIDER_HEIGHT,
    backgroundColor: colors.border.default,
  },
  identity: {
    gap: spacing[4],
    paddingHorizontal: spacing[16],
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    pointerEvents: 'none',
  },
  actions: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[16],
  },
});
