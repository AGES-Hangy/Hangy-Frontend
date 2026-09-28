import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle, TermsCheckbox, type TermsBundle } from '@/components/RegisterFlow/RegisterPieces';
import type { PersonalFormState } from '@/components/RegisterFlow/types';
import { isAtLeast18 } from '@/utils/age';
import { maskPhone } from '@/utils/documentValidation';
import { useBrazilianCities, useBrazilianStates } from '@/hooks/useBrazilLocations';
import { normalizeForSearch } from '@/utils/text';

type Props = {
  form: PersonalFormState;
  onChange: (patch: Partial<PersonalFormState>) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  termsBundle: TermsBundle;
};

export function PersonalStepTwo({ form, onChange, onBack, onSubmit, isSubmitting, termsBundle }: Props) {
  const [touched, setTouched] = useState<{ dateOfBirth?: boolean }>({});
  const { states } = useBrazilianStates();
  const { cities } = useBrazilianCities(form.stateUf || null);

  const stateOptions = states
    .filter((state) => normalizeForSearch(state.name).includes(normalizeForSearch(form.stateLabel)))
    .map((state) => ({ value: state.uf, label: state.name }));

  const cityOptions = cities
    .filter((city) => normalizeForSearch(city.name).includes(normalizeForSearch(form.city)))
    .map((city) => ({ value: String(city.id), label: city.name }));

  const dateOfBirthError =
    form.errors.dateOfBirth
    ?? (touched.dateOfBirth && form.dateOfBirth && !isAtLeast18(form.dateOfBirth)
      ? 'É preciso ter 18 anos ou mais para usar o Hangy.'
      : undefined);

  const isValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.dateOfBirth !== null &&
    isAtLeast18(form.dateOfBirth ?? new Date(0)) &&
    form.stateUf.length > 0 &&
    form.city.trim().length > 0 &&
    form.termsAccepted;

  return (
    <View style={styles.container}>
      <StepTitle>Cadastrar</StepTitle>

      <TextField
        label="Nome"
        placeholder="Viktor Gyokeres"
        value={form.name}
        onChangeText={(text) => onChange({ name: text, errors: { ...form.errors, name: undefined } })}
        error={form.errors.name}
      />
      <TextField
        label="Telefone"
        placeholder="(51) 99999-9999"
        value={form.phone}
        onChangeText={(text) => onChange({ phone: maskPhone(text), errors: { ...form.errors, phone: undefined } })}
        error={form.errors.phone}
        maxLength={15}
      />
      <TextField
        type="Date"
        label="Data de Nascimento"
        dateValue={form.dateOfBirth ?? undefined}
        onChangeDate={(date) => {
          onChange({ dateOfBirth: date, errors: { ...form.errors, dateOfBirth: undefined } });
          setTouched((current) => ({ ...current, dateOfBirth: true }));
        }}
        maximumDate={new Date()}
        error={dateOfBirthError}
      />
      <TextField
        type="Location"
        label="Estado"
        placeholder="Selecione seu estado"
        value={form.stateLabel}
        onChangeText={(text) => onChange({ stateLabel: text, stateUf: '', city: '' })}
        options={stateOptions}
        onSelectOption={(option) => onChange({ stateUf: option.value, stateLabel: option.label, city: '' })}
        error={form.errors.state}
      />
      <TextField
        type="Location"
        label="Cidade"
        placeholder={form.stateUf ? 'Selecione sua cidade' : 'Selecione o estado primeiro'}
        value={form.city}
        onChangeText={(text) => onChange({ city: text })}
        options={cityOptions}
        onSelectOption={(option) => onChange({ city: option.label })}
        disabled={!form.stateUf}
        error={form.errors.city}
      />

      <TermsCheckbox
        checked={form.termsAccepted}
        onChange={(value) => onChange({ termsAccepted: value })}
        termsBundle={termsBundle}
      />

      {form.generalError && <Text style={styles.generalError}>{form.generalError}</Text>}

      <Button label="Voltar" variant="Tertiary" onPress={onBack} disabled={isSubmitting} />
      <Button
        label="Cadastrar"
        onPress={onSubmit}
        disabled={!isValid}
        isLoading={isSubmitting}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[12],
  },
  button: {
    marginTop: spacing[8],
    alignSelf: 'center',
  },
  generalError: {
    ...typography.bodyS,
    color: colors.feedback.error,
    textAlign: 'center',
  },
});
