import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { StepTitle, TermsCheckbox } from '@/components/RegisterFlow/RegisterPieces';
import { AddressAutocompleteField } from '@/components/RegisterFlow/AddressAutocompleteField';
import type { BusinessFormState } from '@/components/RegisterFlow/types';
import { maskPhone } from '@/utils/documentValidation';

type Props = {
  form: BusinessFormState;
  onChange: (patch: Partial<BusinessFormState>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function BusinessStepTwo({ form, onChange, onSubmit, isSubmitting }: Props) {
  const isValid =
    form.businessName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.instagram.trim().length > 0 &&
    form.termsAccepted;

  return (
    <View style={styles.container}>
      <StepTitle>Cadastrar</StepTitle>

      <TextField
        label="Nome da Empresa"
        placeholder="PUCRS"
        value={form.businessName}
        onChangeText={(text) => onChange({ businessName: text, errors: { ...form.errors, businessName: undefined } })}
        error={form.errors.businessName}
      />
      <TextField
        label="Telefone"
        placeholder="(51) 99999-9999"
        value={form.phone}
        onChangeText={(text) => onChange({ phone: maskPhone(text), errors: { ...form.errors, phone: undefined } })}
        error={form.errors.phone}
        maxLength={15}
      />
      <AddressAutocompleteField
        value={form.address}
        onSelect={(suggestion) =>
          onChange({
            address: suggestion.label,
            addressLatitude: suggestion.latitude,
            addressLongitude: suggestion.longitude,
            errors: { ...form.errors, address: undefined },
          })
        }
        error={form.errors.address}
      />
      <TextField
        label="Instagram"
        placeholder="@instagram"
        value={form.instagram}
        onChangeText={(text) => onChange({ instagram: text, errors: { ...form.errors, instagram: undefined } })}
        error={form.errors.instagram}
      />

      <TermsCheckbox checked={form.termsAccepted} onChange={(value) => onChange({ termsAccepted: value })} />

      {form.generalError && <Text style={styles.generalError}>{form.generalError}</Text>}

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
