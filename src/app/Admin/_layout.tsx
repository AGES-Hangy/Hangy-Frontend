import { Stack, router, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNav } from '@/components/AdminNav';
import type { AdminNavDestination } from '@/components/AdminNav';
import { colors } from '@/constants/colors';
import { AdminGuard } from '@/utils/AdminGuard';

/**
 * Rota de cada seção da `AdminNav`. `Usuario` não é uma seção da nav, mas o
 * layout precisa conhecê-la para o `useSegments` calcular `active` corretamente:
 * quando o admin está na ficha de um usuário, a aba "Usuários" fica marcada.
 * Denúncias (task 260) entra aqui quando existir. Conteúdo está fora do escopo.
 */
const ROUTE_BY_DESTINATION: Partial<Record<AdminNavDestination, '/Admin/Painel' | '/Admin/Usuarios'>> = {
  Painel: '/Admin/Painel',
};

const DESTINATIONS: AdminNavDestination[] = ['Painel', 'Denuncias', 'Usuarios', 'Conteudo'];

/** Área administrativa: fora de `(tabs)`, com a `AdminNav` no lugar da `BottomNav`. */
export default function AdminLayout() {
  const segments: string[] = useSegments();
  // `segments` é `['Admin', '<Secao>', ...]`; telas internas mantêm a seção.
  const section = segments[1];
  const active = DESTINATIONS.find((dest) => dest === section) ?? 'Painel';

  return (
    <AdminGuard>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.content}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        <AdminNav
          active={active}
          onNavigate={(dest) => {
            const route = ROUTE_BY_DESTINATION[dest];
            if (route && dest !== active) router.replace(route);
          }}
        />
      </SafeAreaView>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
  },
});
