import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { OfflineBanner } from '@/components/OfflineBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useLogout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Destino do login e da Splash para `role: ADMIN`. As métricas e as denúncias
 * recentes são da task 259, que substitui este conteúdo; aqui fica só o
 * mínimo para a rota existir e a conta conseguir sair.
 */
export default function AdminPainel() {
  const { logout, isLoading } = useLogout();
  const { isOffline } = useNetworkStatus();

  // As telas do painel (259–267) seguem o mesmo padrão: `OfflineBanner` aqui,
  // `Skeleton` na primeira carga e `ErrorScreen` quando ela falhar (README).
  return (
    <View style={[styles.screen, isOffline && styles.contentBelowBanner]}>
      <Text style={styles.title} accessibilityRole="header">
        Painel administrativo
      </Text>
      <Text style={styles.text}>As métricas e as denúncias recentes chegam em breve.</Text>
      <Button
        label="Sair da conta"
        variant="Secondary"
        size="MD"
        isLoading={isLoading}
        onPress={logout}
        style={styles.logout}
      />
      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing[16],
    gap: spacing[8],
    backgroundColor: colors.bg.base,
  },
  // O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o mesmo respiro das outras telas.
  contentBelowBanner: {
    paddingTop: spacing[64],
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  text: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  logout: {
    alignSelf: 'flex-start',
    marginTop: spacing[16],
  },
});
