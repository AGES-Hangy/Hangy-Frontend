import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { AccountTypeHeader, LoginLink } from '@/components/RegisterFlow/RegisterPieces';
import type { PersonalFormState } from '@/components/RegisterFlow/types';
import { isValidCpf, isValidEmail, maskCpf } from '@/utils/documentValidation';

type Props = {
  form: PersonalFormState;
  onChange: (patch: Partial<PersonalFormState>) => void;
  onSwitchToBusiness: () => void;
  onNext: () => void;
};

export function PersonalStepOne({ form, onChange, onSwitchToBusiness, onNext }: Props) {
  const [touched, setTouched] = useState<{ email?: boolean; cpf?: boolean; confirmPassword?: boolean }>({});

  const emailError = form.errors.email
    ?? (touched.email && form.email.length > 0 && !isValidEmail(form.email) ? 'Digite um e-mail válido.' : undefined);
  const cpfError = form.errors.cpf
    ?? (touched.cpf && form.cpf.length > 0 && !isValidCpf(form.cpf) ? 'CPF inválido. Confira os números.' : undefined);
  const confirmPasswordError = form.errors.confirmPassword
    ?? (touched.confirmPassword && form.confirmPassword.length > 0 && form.confirmPassword !== form.password
      ? 'As senhas não coincidem.'
      : undefined);

  const isValid =
    isValidEmail(form.email) &&
    isValidCpf(form.cpf) &&
    form.password.length >= 8 && form.password.length <= 128 &&
    form.confirmPassword === form.password;

  return (
    <View style={styles.container}>
      <AccountTypeHeader value="pf" onChange={(value) => value === 'pj' && onSwitchToBusiness()} />

      <TextField
        label="Email"
        placeholder="seuemail@exemplo.com"
        value={form.email}
        onChangeText={(text) => onChange({ email: text, errors: { ...form.errors, email: undefined } })}
        onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        error={emailError}
      />
      <TextField
        label="CPF"
        placeholder="123.456.789-00"
        value={form.cpf}
        onChangeText={(text) => onChange({ cpf: maskCpf(text), errors: { ...form.errors, cpf: undefined } })}
        onBlur={() => setTouched((current) => ({ ...current, cpf: true }))}
        error={cpfError}
        maxLength={14}
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
