import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

interface SessionLoadErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
}

/**
 * Falha ao ler a sessão (`GET /users/me`) na abertura do app ou na guarda da
 * área Admin. Fica sobre o fundo roxo da Splash e da guarda, por isso o texto
 * é invertido. Não manda para o Login nem para a Home às cegas.
 */
export function SessionLoadError({ title, message, onRetry }: SessionLoadErrorProps) {
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Button
        label="Tentar de novo"
        variant="Accent"
        size="MD"
        onPress={onRetry}
        accessibilityLabel="Tentar carregar a sessão novamente"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[24],
  },
  title: {
    ...typography.h4,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyM,
    color: colors.text.inverse,
    textAlign: 'center',
  },
});
