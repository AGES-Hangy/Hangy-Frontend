import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';

import type { BottomNavProps, BottomNavTab } from './types';

export type { BottomNavActive, BottomNavProps, BottomNavTab } from './types';

/** Altura da barra sem a safe area — o `insets.bottom` é somado por baixo. */
const BAR_HEIGHT = 72;
/** Alvo de toque de cada aba. */
const ITEM_SIZE = 44;
const ICON_SIZE = 24;
/** Ponto sob a aba ativa: `r=2` no frame, ou seja, 4 de diâmetro. */
const DOT_SIZE = 4;
/** Botão central de criar evento. */
const CREATE_SIZE = 48;

const TABS: { tab: BottomNavTab; icon: IconName; label: string }[] = [
  { tab: 'Home', icon: 'house', label: 'Início' },
  { tab: 'AoVivo', icon: 'radio', label: 'Ao vivo' },
  { tab: 'Buscar', icon: 'search', label: 'Buscar' },
  { tab: 'Perfil', icon: 'user', label: 'Perfil' },
];

function NavItem({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: IconName;
  label: string;
  isActive: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={label}
      // `aria-selected` e não `accessibilityState`: o react-native-web descarta
      // o segundo, e o React Native mapeia o primeiro para o estado nativo.
      aria-selected={isActive}
    >
      <Icon name={icon} color={isActive ? colors.action.primary : colors.text.tertiary} />
      {/* O ponto some quando a aba está inativa, mas o espaço fica reservado
          para o ícone não pular de posição entre os dois estados. */}
      <View style={[styles.dot, isActive && styles.dotActive]} />
    </Pressable>
  );
}

export function BottomNav({ active = 'Home', onTabPress, onCreatePress }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  const [homeTab, liveTab, searchTab, profileTab] = TABS;

  const renderItem = ({ tab, icon, label }: (typeof TABS)[number]) => (
    <NavItem
      key={tab}
      icon={icon}
      label={label}
      isActive={active === tab}
      onPress={() => onTabPress?.(tab)}
    />
  );

  return (
    <View
      style={[
        styles.bar,
        // `height` inclui o padding no React Native, então a safe area precisa
        // entrar na altura total — senão a barra é espremida.
        { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.group}>
        {renderItem(homeTab)}
        {renderItem(liveTab)}
      </View>

      <Pressable
        onPress={onCreatePress}
        style={styles.create}
        accessibilityRole="button"
        accessibilityLabel="Criar evento"
      >
        <Icon name="plus" color={colors.text.inverse} />
      </Pressable>

      <View style={styles.group}>
        {renderItem(searchTab)}
        {renderItem(profileTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
    borderTopWidth: 1.5,
    borderTopColor: colors.border.default,
  },
  group: {
    flexDirection: 'row',
    gap: spacing[24],
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.action.primary,
  },
  create: {
    width: CREATE_SIZE,
    height: CREATE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.action.primary,
    ...elevation[3],
  },
});
