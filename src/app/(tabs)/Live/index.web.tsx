import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * Versão web (Metro resolve `.web.tsx` antes de `.tsx` nesta plataforma) —
 * `react-native-maps` não roda no navegador, e como o Expo Router carrega
 * todas as rotas ao iniciar, importá-lo aqui derrubaria o app web inteiro.
 */
export default function Live() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>O mapa Ao Vivo está disponível só no app (Android/iOS).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[24],
    backgroundColor: colors.bg.base,
  },
  text: {
    ...typography.bodyL,
    textAlign: 'center',
  },
});
