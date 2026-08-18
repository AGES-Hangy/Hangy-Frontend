import { useState } from 'react';
import {
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

import { colors } from '@/constants/colors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Entrar</Text>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.inputBackground,
    color: colors.inputText,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.logo,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
