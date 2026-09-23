import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export default function Sample() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../../assets/images/logo.svg')}
          style={styles.logo}
          contentFit="contain"
          accessible={false}
        />

        <View style={styles.panel}>
          <Text style={styles.title}>Entrar</Text>
          <View style={styles.fields}>
            <View style={styles.networkError} accessibilityRole="alert">
              <Icon name="circle-alert" size={20} color={palette.error.default} />
              <Text style={styles.networkErrorText}>Sem conexão com a internet</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tentar de novo"
                hitSlop={spacing[8]}
              >
                <Text style={styles.retryLink}>Tentar de novo</Text>
              </Pressable>
            </View>
            <View style={styles.accountType} accessibilityRole="tablist">
              <Pressable
                style={styles.accountTypeSelected}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
              >
                <Text style={styles.accountTypeSelectedText}>Pessoa Física</Text>
              </Pressable>
              <Pressable
                style={styles.accountTypeOption}
                accessibilityRole="tab"
                accessibilityState={{ selected: false }}
              >
                <Text style={styles.accountTypeText}>Empresa</Text>
              </Pressable>
            </View>

            <TextField
              label="CPF"
              placeholder="999.999.999-99"
              keyboardType="number-pad"
              value="999.999.999-99"
              accessibilityLabel="CPF"
            />
            <TextField
              type="Password"
              label="Senha"
              value="minhasenha"
              accessibilityLabel="Senha"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Esqueci minha senha"
              hitSlop={spacing[8]}
            >
              <Text style={styles.link}>Esqueci minha senha?</Text>
            </Pressable>

            <Button
              label="Entrar"
              variant="Primary"
              accessibilityLabel="Entrar"
              style={styles.submit}
            />

            <Text style={styles.registerPrompt}>Não possui uma conta?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Criar conta"
              hitSlop={spacing[8]}
            >
              <Text style={styles.link}>Cadastre-se</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary[600],
  },
  form: {
    alignItems: 'center',
    width: '100%',
    flexGrow: 1,
    paddingTop: spacing[64],
    paddingHorizontal: spacing[16],
    gap: spacing[16],
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: spacing[16],
  },
  panel: {
    width: '100%',
    maxWidth: 393,
    flexGrow: 1,
    backgroundColor: colors.bg.subtle,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[16],
    paddingTop: spacing[20],
    gap: spacing[12],
  },
  title: {
    ...typography.h2,
    color: colors.text.brand,
    textAlign: 'center',
  },
  fields: {
    gap: spacing[12],
  },
  networkError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: palette.error.bg,
    borderWidth: 1.5,
    borderColor: palette.error.border,
    borderRadius: radius.sm,
    padding: spacing[12],
  },
  networkErrorText: {
    ...typography.bodyS,
    color: colors.text.primary,
    flex: 1,
  },
  retryLink: {
    ...typography.labelS,
    color: colors.text.brand,
    textDecorationLine: 'underline',
  },
  accountType: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.full,
    minHeight: 44,
    padding: spacing[4],
  },
  accountTypeSelected: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.base,
    borderRadius: radius.full,
  },
  accountTypeOption: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountTypeSelectedText: {
    ...typography.labelS,
    color: colors.text.brand,
  },
  accountTypeText: {
    ...typography.labelS,
    color: colors.text.secondary,
  },
  link: {
    ...typography.bodyS,
    color: colors.text.brand,
    textAlign: 'center',
  },
  submit: {
    alignSelf: 'center',
    minWidth: 172,
    backgroundColor: palette.primary[600],
  },
  registerPrompt: {
    ...typography.bodyS,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
