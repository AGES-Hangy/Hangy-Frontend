import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Stepper } from '@/components/Stepper';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';

/**
 * Casca visual compartilhada pelas 6 telas do cadastro (fundo roxo + logo +
 * cartão arredondado) — o que muda entre elas é só o conteúdo (título,
 * campos, tags) e a altura do cabeçalho, que aqui vira `variant`:
 * `form` (etapas 1-2, cabeçalho maior) e `compact` (etapas de tags).
 * A altura do cabeçalho do `form` é a mesma (em %) do Login e do
 * PasswordReset, pra manter o painel branco na mesma altura ao trocar
 * de tela.
 */
const HEADER_HEIGHT = { form: '26.5%', compact: 130 } as const;
const LOGO_SIZE = {
  form: { width: 220, height: 85 },
  compact: { width: 140, height: 54 },
} as const;
const TOTAL_STEPS = 4;

type Props = {
  variant?: 'form' | 'compact';
  step: number;
  children: ReactNode;
};

export function RegisterScaffold({ variant = 'form', step, children }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { height: HEADER_HEIGHT[variant] }]}>
        <Image
          source={require('../../../assets/images/logo.svg')}
          style={LOGO_SIZE[variant]}
          contentFit="contain"
          accessibilityLabel="Hangy"
        />
      </View>
      <View style={styles.card}>
        <View style={styles.stepperWrapper}>
          <Stepper step={step} total={TOTAL_STEPS} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.primary[600],
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: palette.primary[50],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  stepperWrapper: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  scrollContent: {
    padding: spacing[16],
    paddingBottom: spacing[32],
    gap: spacing[20],
  },
});
