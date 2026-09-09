import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

type FieldLabelProps = {
  label: string;
  /** Asterisco em `colors.feedback.error`. */
  required?: boolean;
  /** Texto à direita: "Opcional", "Até 5". */
  hint?: string;
};

/**
 * Linha de rótulo dos campos da etapa 1. O `TextField` desenha o rótulo como
 * um `Text` único, sem asterisco e sem slot à direita — então os frames não
 * são reproduzíveis com a prop `label`. Este componente desenha a linha e os
 * campos são passados sem `label`.
 *
 * O layout espelha o cabeçalho do `FileUpload` (row, space-between,
 * `marginBottom: spacing[8]`) para as quatro linhas ficarem alinhadas.
 */
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
