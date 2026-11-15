import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';

type LoadingScreenProps = {
  /** O que está carregando, para o leitor de tela. Ex.: "Carregando evento". */
  accessibilityLabel: string;
  /** Escape hatch de layout. Não use para trocar a cor. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Carregamento de tela cheia (task 141), sem frame no Figma: só o indicador
 * central. Use apenas quando não há métrica de conteúdo para um `Skeleton` —
 * a primeira carga de uma lista ou de um detalhe é sempre `Skeleton`, para
 * a tela não saltar quando os dados chegam.
 */
export function LoadingScreen({ accessibilityLabel, style }: LoadingScreenProps) {
  return (
    <View
      style={[styles.screen, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size="large" color={colors.action.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
  },
});
