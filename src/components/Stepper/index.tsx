import { View, StyleSheet } from 'react-native';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import type { StepperProps } from './types';

export function Stepper({ step, total = 5 }: StepperProps) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);
  const label = `Passo ${step} de ${total}`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      {steps.map((barStep) => {
        // concluído e atual compartilham a mesma cor; só o futuro muda
        const isCompletedOrCurrent = barStep <= step;
        return (
          <View
            key={barStep}
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.bar,
              {
                backgroundColor: isCompletedOrCurrent
                  ? palette.primary[500]
                  : palette.neutral[200],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  bar: {
    flex: 1,
    height: spacing[4],
    borderRadius: radius.full,
  },
});
