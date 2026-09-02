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
/**
 * Largura da linha de itens: os 390 do frame do Figma menos o padding lateral
 * de 16 dos dois lados. Acima disso a linha para de esticar e fica centrada,
 * para o espaçamento entre os ícones não mudar de aparelho para aparelho.
 */
const CONTENT_MAX_WIDTH = 390 - spacing[16] * 2;
/**
 * Folga que a barra já tem abaixo dos itens ((72 - 44) / 2). A área do
 * indicador de home cabe aí primeiro; só o que passa disso vira padding extra,
 * senão a barra fica desnecessariamente alta em aparelho com gesture bar.
 */
const BOTTOM_SLACK = (BAR_HEIGHT - ITEM_SIZE) / 2;

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

  const extraBottom = Math.max(insets.bottom - BOTTOM_SLACK, 0);

  return (
    <View
      style={[
        styles.bar,
        // `height` inclui o padding no React Native, então o que sobra da safe
        // area precisa entrar na altura total — senão a barra é espremida.
        { height: BAR_HEIGHT + extraBottom, paddingBottom: extraBottom },
      ]}
    >
      <View style={styles.row}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.base,
    borderTopWidth: 1.5,
    borderTopColor: colors.border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
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
