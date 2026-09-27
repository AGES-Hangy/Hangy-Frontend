import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * Sem frame no Figma (não está entre as 7 telas listadas na task) — tela
 * simples só com os tokens do Design System. `/Onboarding` (destino do
 * "Voltar" na task) não existe no app ainda; volta pro `/Login`, que é o
 * ponto de entrada pré-auth real hoje.
 */
export default function RegisterBlocked() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.iconWrapper}>
        <Icon name="circle-alert" size={40} color={colors.feedback.error} />
      </View>
      <Text style={styles.title}>Cadastro bloqueado</Text>
      <Text style={styles.message}>
        É preciso ter 18 anos ou mais para criar uma conta no Hangy.
      </Text>
      <Button label="Voltar" onPress={() => router.replace('/Login')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
    paddingHorizontal: spacing[32],
    backgroundColor: colors.bg.base,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.error.bg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyL,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing[16],
  },
});
