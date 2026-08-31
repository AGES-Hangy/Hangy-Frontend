import { Tabs, router } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { AuthGuard } from '@/utils/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import type { BottomNavActive, BottomNavTab } from '@/components/BottomNav';
import { TopAppBar } from '@/components/TopAppBar';
import { noNavbarScreens } from '@/constants/noNavbarScreens';

/** Rota de cada aba do Figma. As duas tabelas são inversas uma da outra. */
const ROUTE_BY_TAB: Record<BottomNavTab, string> = {
  Home: 'Home/index',
  AoVivo: 'Live/index',
  Buscar: 'Search/index',
  Perfil: 'Profile/index',
};

const TAB_BY_ROUTE: Record<string, BottomNavTab> = Object.fromEntries(
  Object.entries(ROUTE_BY_TAB).map(([tab, route]) => [route, tab as BottomNavTab]),
);

function TabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index];

  // noNavbarScreens continua sendo a fonte de verdade de quem esconde a barra.
  const isHidden = noNavbarScreens.some((screen) => current.name === `(screens)/${screen}/index`);
  if (isHidden) return null;

  // Telas de (screens) não pertencem a nenhuma aba — é a variante Limpo.
  const active: BottomNavActive = TAB_BY_ROUTE[current.name] ?? 'Limpo';

  return (
    <BottomNav
      active={active}
      onTabPress={(tab) => {
        const targetName = ROUTE_BY_TAB[tab];
        const target = state.routes.find((route) => route.name === targetName);
        if (!target) return;

        // Emitir tabPress mantém o comportamento padrão do navegador (como o
        // scroll-to-top e o reset de stack) que um tabBar próprio perderia.
        const event = navigation.emit({
          type: 'tabPress',
          target: target.key,
          canPreventDefault: true,
        });

        if (target.key !== current.key && !event.defaultPrevented) {
          navigation.navigate(target.name);
        }
      }}
      onCreatePress={() => router.push('/CreateEvent')}
    />
  );
}

export default function TabsLayout() {
  return (
    <AuthGuard>
      <Tabs
        backBehavior="history"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: true,
          // Padrão de todas as telas. A que precisa de outra barra sobrescreve
          // com useTopAppBar, então o layout não conhece telas específicas.
          header: () => <TopAppBar variant="Home" />,
        }}
      />
    </AuthGuard>
  );
}
