import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useLogin } from '@/hooks/useLogin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const { login, isLoading, error, fieldErrors, clearFieldError } = useLogin();
  const { showErrorToast } = useToast();

  const normalizedEmail = email.trim();
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);
  const emailError = fieldErrors.email ?? (touched.email && !normalizedEmail
    ? 'Informe seu e-mail.'
    : touched.email && !isEmailValid
      ? 'Digite um e-mail válido.'
      : undefined);
  const passwordError = fieldErrors.password ?? (touched.password && !password
    ? 'Informe sua senha.'
    : undefined);
  const isValid = isEmailValid && password.length > 0;
  const isRetryableError = error === 'Não foi possível carregar. Tente de novo.'
    || error === 'Não foi possível conectar ao servidor'
    || error === 'Não foi possível salvar sua sessão. Tente novamente.'
    || error === 'A conexão demorou demais';

  useEffect(() => {
    if (!error) return;
    if (!isRetryableError) showErrorToast(error);
    if (error === 'E-mail ou senha incorretos' || error === 'Esta conta foi excluída') {
      setPassword('');
    }
  }, [error, isRetryableError, showErrorToast]);

  async function handleSubmit() {
    setTouched({ email: true, password: true });
    if (!isValid || isLoading) return;

    const result = await login(normalizedEmail, password);
    if (result) {
      // A Home é a rota autenticada disponível para ambos os tipos de conta.
      router.replace('/Home');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <Image source={require('../../../assets/images/logo.svg')} style={styles.logo} contentFit="contain" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Entrar</Text>
        {error && isRetryableError && (
          <View style={styles.formErrorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.formError}>{error}</Text>
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading || !isValid}
              accessibilityRole="button"
              accessibilityLabel="Tentar entrar novamente"
              hitSlop={spacing[8]}
            >
              <Text style={[styles.retryLink, (!isValid || isLoading) && styles.disabledLink]}>
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        )}
        <TextField
          label="E-mail"
          placeholder="seuemail@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(value) => { setEmail(value); clearFieldError('email'); }}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          error={emailError}
          disabled={isLoading}
          accessibilityLabel="E-mail"
        />
        <TextField
          type="Password"
          label="Senha"
          placeholder="Digite sua senha"
          value={password}
          onChangeText={(value) => { setPassword(value); clearFieldError('password'); }}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          error={passwordError}
          disabled={isLoading}
          accessibilityLabel="Senha"
        />
        <Pressable
          disabled
          accessibilityState={{ disabled: true }}
          accessibilityRole="button"
          accessibilityLabel="Recuperação de senha indisponível nesta versão"
          hitSlop={spacing[8]}
        >
          <Text style={[styles.link, styles.disabledLink]}>Recuperação de senha em breve</Text>
        </Pressable>
        <Button
          label="Entrar"
          variant="Primary"
          size="LG"
          isLoading={isLoading}
          disabled={!isValid}
          onPress={handleSubmit}
          accessibilityLabel="Entrar"
          style={styles.submit}
        />
        <Text style={styles.registerPrompt}>Não possui uma conta?</Text>
        <Pressable
          disabled
          accessibilityState={{ disabled: true }}
          accessibilityRole="button"
          accessibilityLabel="Cadastro indisponível nesta versão"
          hitSlop={spacing[8]}
        >
          <Text style={[styles.link, styles.disabledLink]}>Cadastro em breve</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: palette.primary[600],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[64],
  },
  logo: {
    width: 220,
    height: 100,
    marginBottom: spacing[16],
  },
  scroll: {
    width: '100%',
    maxWidth: 393,
  },
  form: {
    width: '100%',
    maxWidth: 393,
    alignSelf: 'center',
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
    marginBottom: spacing[8],
  },
  formError: {
    ...typography.bodyS,
    color: colors.feedback.error,
    textAlign: 'center',
  },
  formErrorBox: {
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[8],
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  retryLink: {
    ...typography.labelS,
    color: colors.text.brand,
    textDecorationLine: 'underline',
  },
  disabledLink: {
    color: colors.text.disabled,
  },
  link: {
    ...typography.bodyS,
    color: colors.text.brand,
    textAlign: 'center',
  },
  registerPrompt: {
    ...typography.bodyS,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  submit: {
    alignSelf: 'center',
    minWidth: 172,
  },
});
