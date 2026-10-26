import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { AdminNavDestination, AdminNavProps } from './types';

export type { AdminNavDestination, AdminNavProps } from './types';

/** Altura da barra sem a safe area — o `insets.bottom` é somado por baixo. */
const BAR_HEIGHT = 72;
/** Alvo de toque mínimo de cada item. */
const ITEM_MIN_SIZE = 44;
/**
 * Folga que a barra já tem abaixo dos itens. A área do indicador de home
 * cabe aí primeiro, como na `BottomNav`.
 */
const BOTTOM_SLACK = spacing[12];

const ITEMS: { dest: AdminNavDestination; icon: IconName; label: string }[] = [
  { dest: 'Painel', icon: 'house', label: 'Painel' },
  { dest: 'Denuncias', icon: 'flag', label: 'Denúncias' },
  { dest: 'Usuarios', icon: 'users', label: 'Usuários' },
  { dest: 'Conteudo', icon: 'calendar', label: 'Conteúdo' },
];

/** Barra inferior da área administrativa. Substitui a `BottomNav` na moderação. */
export function AdminNav({ active, onNavigate }: AdminNavProps) {
  const insets = useSafeAreaInsets();
  const extraBottom = Math.max(insets.bottom - BOTTOM_SLACK, 0);

  return (
    <View
      style={[
        styles.bar,
        // `height` inclui o padding no React Native, então o que sobra da safe
        // area precisa entrar na altura total — senão a barra é espremida.
        { height: BAR_HEIGHT + extraBottom, paddingBottom: extraBottom },
      ]}
      accessibilityRole="tablist"
    >
      {ITEMS.map(({ dest, icon, label }) => {
        const isActive = active === dest;
        const color = isActive ? colors.action.primary : colors.text.tertiary;
        return (
          <Pressable
            key={dest}
            onPress={() => onNavigate(dest)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={label}
            // `aria-selected` e não `accessibilityState`: o react-native-web
            // descarta o segundo, como já documentado na `BottomNav`.
            aria-selected={isActive}
          >
            <Icon name={icon} color={color} />
            {/* O label já está no `accessibilityLabel` do item. */}
            <Text
              style={[styles.label, { color }]}
              numberOfLines={1}
              importantForAccessibility="no"
              aria-hidden
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  item: {
    flex: 1,
    minHeight: ITEM_MIN_SIZE,
    minWidth: ITEM_MIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  label: {
    ...typography.caption,
  },
});
