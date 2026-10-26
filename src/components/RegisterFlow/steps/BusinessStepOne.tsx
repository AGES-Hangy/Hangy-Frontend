import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { AccountTypeHeader, LoginLink } from '@/components/RegisterFlow/RegisterPieces';
import type { BusinessFormState } from '@/components/RegisterFlow/types';
import { isValidCnpj, isValidEmail, maskCnpj } from '@/utils/documentValidation';

type Props = {
  form: BusinessFormState;
  onChange: (patch: Partial<BusinessFormState>) => void;
  onSwitchToPersonal: () => void;
  onNext: () => void;
};

export function BusinessStepOne({ form, onChange, onSwitchToPersonal, onNext }: Props) {
  const [touched, setTouched] = useState<{ email?: boolean; cnpj?: boolean; confirmPassword?: boolean }>({});

  const emailError = form.errors.email
    ?? (touched.email && form.email.length > 0 && !isValidEmail(form.email) ? 'Digite um e-mail válido.' : undefined);
  const cnpjError = form.errors.cnpj
    ?? (touched.cnpj && form.cnpj.length > 0 && !isValidCnpj(form.cnpj)
      ? 'CNPJ inválido ou não encontrado na Receita.'
      : undefined);
  const confirmPasswordError = form.errors.confirmPassword
    ?? (touched.confirmPassword && form.confirmPassword.length > 0 && form.confirmPassword !== form.password
      ? 'As senhas não coincidem.'
      : undefined);

  const isValid =
    isValidEmail(form.email) &&
    isValidCnpj(form.cnpj) &&
    form.password.length >= 8 && form.password.length <= 128 &&
    form.confirmPassword === form.password;

  return (
    <View style={styles.container}>
      <AccountTypeHeader value="pj" onChange={(value) => value === 'pf' && onSwitchToPersonal()} />

      <TextField
        label="Email"
        placeholder="email@email.com"
        value={form.email}
        onChangeText={(text) => onChange({ email: text, errors: { ...form.errors, email: undefined } })}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        error={emailError}
      />
      <TextField
        label="CNPJ"
        placeholder="11.111.111/1111-11"
        value={form.cnpj}
        onChangeText={(text) => onChange({ cnpj: maskCnpj(text), errors: { ...form.errors, cnpj: undefined } })}
        onBlur={() => setTouched((current) => ({ ...current, cnpj: true }))}
        error={cnpjError}
        maxLength={18}
      />
      <TextField
        type="Password"
        label="Senha"
        value={form.password}
        onChangeText={(text) => onChange({ password: text, errors: { ...form.errors, password: undefined } })}
        error={form.errors.password}
        helper="Use entre 8 e 128 caracteres."
      />
      <TextField
        type="Password"
        label="Confirmar Senha"
        value={form.confirmPassword}
        onChangeText={(text) => onChange({ confirmPassword: text })}
        onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
        error={confirmPasswordError}
      />

      {form.generalError && <Text style={styles.generalError}>{form.generalError}</Text>}

      <View style={styles.bottom}>
        <LoginLink />
        <Button label="Próximo" onPress={onNext} disabled={!isValid} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[12],
  },
  bottom: {
    marginTop: spacing[8],
    alignItems: 'center',
    gap: spacing[16],
  },
  button: {
    alignSelf: 'center',
  },
  generalError: {
    ...typography.bodyS,
    color: colors.feedback.error,
    textAlign: 'center',
  },
});
