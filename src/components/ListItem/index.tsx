import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import type { ListItemProps } from '@/components/ListItem/types';
import { colors } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const METRICS = layout.listItem;

/**
 * Linha de pessoa ou estabelecimento nos resultados de busca.
 *
 * ```tsx
 * <ListItem type="Person" name="Rafaela Souza" subtitle="Trilha, brunch e fotografia · 12 conexões em comum" onPress={openProfile} />
 * <ListItem type="Business" name="Quiero Café" subtitle="Cafeteria · Cidade Baixa · 1,2 km" onPress={openStore} />
 * ```
 */
export function ListItem({
  type,
  name,
  subtitle,
  avatarUri,
  trailing,
  onPress,
}: ListItemProps) {
  const hasTrailing = trailing !== undefined && trailing !== null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${name}. ${subtitle}` : name}
        style={({ pressed }) => [styles.main, pressed && { opacity: pressedOpacity }]}
      >
        <Avatar
          variant={type === 'Business' ? 'Store' : 'User'}
          diameter={METRICS.avatarSize}
          source={avatarUri ? { uri: avatarUri } : undefined}
        />

        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {!hasTrailing && (
          <Icon
            name="chevron-right"
            size={METRICS.chevronSize}
            color={colors.text.tertiary}
            strokeWidth={2}
          />
        )}
      </Pressable>

      {hasTrailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: METRICS.minHeight,
    borderWidth: METRICS.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[8],
    paddingRight: spacing[12],
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  name: {
    ...typography.labelL,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  trailing: {
    paddingRight: spacing[12],
  },
});

export type { ListItemProps, ListItemType } from '@/components/ListItem/types';
