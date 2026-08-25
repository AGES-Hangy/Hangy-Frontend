import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { colors } from '@/constants/colors';
import { useLogin } from '@/hooks/useLogin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useLogin();

  async function handleSubmit() {
    const result = await login(email, password);
    if (result) {
      router.replace('/Home');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <Image
                      source={require('../../../assets/images/logo.svg')}
                      style={styles.logo}
                      contentFit="contain"
                    />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.text.tertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.text.tertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={styles.button}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.primary,
    paddingHorizontal: 24,
  },
  logo: {
    width: 250,
    height: 100,
    marginBottom: 20
  },
  form: {
    width: '100%',
    maxWidth: 360,
    gap: 16,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface.sunken,
    color: colors.text.primary,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.secondary,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  error: {
    color: colors.feedback.error,
    fontSize: 14,
  },
});
