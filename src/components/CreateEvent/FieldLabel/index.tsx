import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

type FieldLabelProps = {
  label: string;
  required?: boolean;
  hint?: string;
};

export function FieldLabel({ label, required, hint }: FieldLabelProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  label: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  asterisk: {
    ...typography.labelM,
    color: colors.feedback.error,
  },
  hint: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
});
