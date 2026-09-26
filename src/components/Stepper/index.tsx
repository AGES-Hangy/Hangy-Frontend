import { View, Text, StyleSheet } from 'react-native';
import { palette } from '@/constants/colors';
import type { StepperProps } from './types';

const BAR_HEIGHT = 4;
const BAR_GAP = 12;
const BAR_RADIUS = 9999; // raio full

export function Stepper({
  totalSteps,
  currentStep,
  showLabel = true,
  accessibilityLabel,
}: StepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, index) => index + 1);
  const label = accessibilityLabel ?? `Passo ${currentStep} de ${totalSteps}`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
    >
      <View style={styles.track} importantForAccessibility="no-hide-descendants">
        {steps.map((step) => {
          // concluído e atual compartilham a mesma cor; só o futuro muda
          const isCompletedOrCurrent = step <= currentStep;
          return (
            <View
              key={step}
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

      {showLabel ? (
        <Text style={styles.label} allowFontScaling>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
  },
  bar: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
  },
  label: {
    marginTop: 8,
    color: palette.primary[500],
    fontWeight: '600',
  },
});
