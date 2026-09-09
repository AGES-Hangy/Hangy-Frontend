import { StyleSheet, View } from 'react-native';

import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';

/** Altura das barras do stepper no frame do Figma — não cai na escala de `spacing`. */
const BAR_HEIGHT = 6;

type StepperProps = {
  current: 1 | 2;
  total?: number;
};

/**
 * Barra de progresso do wizard de criação de evento: uma barra por etapa,
 * todas da mesma largura. Renderizada uma única vez no container, acima do
 * conteúdo, para a etapa 2 herdá-la sem duplicação.
 */
export function Stepper({ current, total = 2 }: StepperProps) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${current} de ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {steps.map((step) => (
        <View
          key={step}
          style={[
            styles.bar,
            {
              backgroundColor:
                step === current ? colors.action.primary : palette.primary[200],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing[8],
    marginHorizontal: spacing[16],
    marginVertical: spacing[16],
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: radius.full,
  },
});
