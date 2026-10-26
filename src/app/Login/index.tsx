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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { PENDING_INVITE_KEY } from '@/constants/invite';
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
      // Quem abriu um link de convite sem sessão foi mandado para cá pelo
      // EventDetail, que guardou o token; retoma o convite em vez de ir à Home.
      const pendingInviteToken = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (pendingInviteToken) {
        await AsyncStorage.removeItem(PENDING_INVITE_KEY);
        router.replace({ pathname: '/EventDetail', params: { token: pendingInviteToken } });
        return;
      }

      // A Home é a rota autenticada disponível para ambos os tipos de conta.
      router.replace('/Home');
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.brandArea}>
        <Image source={require('../../../assets/images/logo.svg')} style={styles.logo} contentFit="contain" />
      </View>

      <View style={styles.panel}>
        <KeyboardAvoidingView
          style={styles.panelFlex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
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
              onPress={() => router.push('/PasswordReset')}
              disabled={isLoading}
              accessibilityState={{ disabled: isLoading }}
              accessibilityRole="button"
              accessibilityLabel="Esqueceu a senha?"
              style={styles.forgotLink}
              hitSlop={spacing[12]}
            >
              <Text style={[styles.forgotLinkText, isLoading && styles.disabledLink]}>Esqueceu a senha?</Text>
            </Pressable>
            <Text style={styles.registerPrompt}>
              Não possui uma conta?{' '}
              <Text
                style={styles.registerLink}
                onPress={() => router.push('/Register')}
                accessibilityRole="link"
                accessibilityLabel="Cadastre-se"
              >
                Cadastre-se
              </Text>
            </Text>
            <Button
              label="ENTRAR"
              variant="Primary"
              size="LG"
              isLoading={isLoading}
              disabled={!isValid}
              onPress={handleSubmit}
              accessibilityLabel="Entrar"
              style={styles.submit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.primary[600],
  },
  brandArea: {
    height: '26.5%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 85,
  },
  panel: {
    flex: 1,
    backgroundColor: palette.primary[50],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  panelFlex: {
    flex: 1,
  },
  panelContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[40],
    gap: spacing[12],
  },
  title: {
    ...typography.h1,
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
  forgotLink: {
    alignSelf: 'flex-start',
  },
  forgotLinkText: {
    ...typography.labelM,
    color: palette.primary[600],
  },
  registerPrompt: {
    ...typography.bodyM,
    color: palette.primary[600],
    textAlign: 'center',
    marginTop: spacing[16],
  },
  registerLink: {
    ...typography.bodyM,
    color: palette.primary[600],
  },
  submit: {
    alignSelf: 'center',
    minWidth: 199,
  },
});
