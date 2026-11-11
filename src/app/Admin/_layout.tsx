import { Stack, router, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNav } from '@/components/AdminNav';
import type { AdminNavDestination } from '@/components/AdminNav';
import { colors } from '@/constants/colors';
import { AdminGuard } from '@/utils/AdminGuard';

/**
 * Rota de cada seção da `AdminNav`. Só o Painel tem tela por enquanto:
 * Denúncias (task 260) e Usuários (task 262) entram aqui quando existirem, e
 * Conteúdo está fora do escopo do épico E11 — tocar nelas não navega.
 */
const ROUTE_BY_DESTINATION: Partial<Record<AdminNavDestination, '/Admin/Painel'>> = {
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
