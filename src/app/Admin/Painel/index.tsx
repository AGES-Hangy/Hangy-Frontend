import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useLogout } from '@/hooks/useLogout';

/**
 * Destino do login e da Splash para `role: ADMIN`. As métricas e as denúncias
 * recentes são da task 259, que substitui este conteúdo; aqui fica só o
 * mínimo para a rota existir e a conta conseguir sair.
 */
export default function AdminPainel() {
  const { logout, isLoading } = useLogout();

  return (
    <View style={styles.screen}>
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
