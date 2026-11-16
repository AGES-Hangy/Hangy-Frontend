import { Stack, router, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNav } from '@/components/AdminNav';
import type { AdminNavDestination } from '@/components/AdminNav';
import { colors } from '@/constants/colors';
import { AdminGuard } from '@/utils/AdminGuard';

/**
 * Rota de cada seção da `AdminNav`. Painel e Conteúdo (gestão de tags, task 264) têm
 * tela; Denúncias (task 260) e Usuários (task 262) entram aqui quando existirem.
 */
const ROUTE_BY_DESTINATION: Partial<Record<AdminNavDestination, '/Admin/Painel' | '/Admin/Tags'>> = {
  Painel: '/Admin/Painel',
  Conteudo: '/Admin/Tags',
};

const DESTINATIONS: AdminNavDestination[] = ['Painel', 'Denuncias', 'Usuarios', 'Conteudo'];

/** Pasta da rota → seção da `AdminNav`, quando os nomes não coincidem. */
const DESTINATION_BY_SECTION: Record<string, AdminNavDestination> = {
  Tags: 'Conteudo',
};

/** Área administrativa: fora de `(tabs)`, com a `AdminNav` no lugar da `BottomNav`. */
export default function AdminLayout() {
  const segments: string[] = useSegments();
  // `segments` é `['Admin', '<Secao>', ...]`; telas internas mantêm a seção.
  const section = segments[1] ?? '';
  const active =
    DESTINATIONS.find((dest) => dest === section) ?? DESTINATION_BY_SECTION[section] ?? 'Painel';
  // Telas internas de uma seção (fichas como `Denuncias/[id]` e
  // `Usuarios/[id]`) não têm a `AdminNav`: o rodapé é das ações da própria
  // tela, que soma a safe area de baixo.
  const hidesNav = segments.length > 2 || section === 'Auditoria';

  return (
    <AdminGuard>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.content}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        {!hidesNav && (
          <AdminNav
            active={active}
            onNavigate={(dest) => {
              const route = ROUTE_BY_DESTINATION[dest];
              if (route && dest !== active) router.replace(route);
            }}
          />
        )}
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
