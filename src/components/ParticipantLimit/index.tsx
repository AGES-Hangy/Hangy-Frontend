import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { ParticipantLimitProps } from '@/components/ParticipantLimit/types';

const CARD_HEIGHT = 89;
const BORDER_WIDTH = 1.5;

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const TRACK_RADIUS = 12;
const DOT_SIZE = 16;
const DOT_TRAVEL = TRACK_WIDTH - DOT_SIZE - 8; // 4px padding each side

function CustomSwitch({
  value,
  onValueChange,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const dotX = anim.interpolate({ inputRange: [0, 1], outputRange: [4, 4 + DOT_TRAVEL] });
  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.neutral[300], colors.action.primary],
  });
  const dotColor = value ? colors.bg.base : colors.surface.sunken;

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel="Sem limite de participantes"
    >
      <Animated.View style={[styles.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[styles.dot, { transform: [{ translateX: dotX }], backgroundColor: dotColor }]} />
      </Animated.View>
    </Pressable>
  );
}

export function ParticipantLimit({
  value,
  onChangeValue,
  unlimited,
  onChangeUnlimited,
  disabled = false,
}: ParticipantLimitProps) {
  const fieldDisabled = disabled || unlimited;

  const stepperBg = fieldDisabled ? colors.surface.sunken : colors.surface.card;
  const stepperBorderColor = fieldDisabled ? palette.neutral[200] : palette.neutral[300];
  const toggleBg = disabled ? colors.surface.sunken : colors.surface.card;
  const toggleBorderColor = disabled ? palette.neutral[200] : palette.neutral[300];
  const fieldLabelColor = disabled ? colors.text.disabled : palette.neutral[700];
  const countColor = fieldDisabled ? colors.text.disabled : colors.text.primary;
  const stepperColor = fieldDisabled ? colors.text.disabled : colors.action.primary;

  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function decrement() {
    if (!fieldDisabled && value > 0) onChangeValue(value - 1);
  }

  function increment() {
    if (!fieldDisabled && value < 999) onChangeValue(value + 1);
  }

  function handleChangeText(text: string) {
    if (/^\d*$/.test(text)) setDraft(text);
  }

  function handleBlur() {
    const parsed = parseInt(draft, 10);
    const clamped = isNaN(parsed) ? 0 : Math.min(999, Math.max(0, parsed));
    onChangeValue(clamped);
    setDraft(String(clamped));
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.labelM, { color: fieldLabelColor }]}>Limite de participantes</Text>

      <View style={styles.row}>
        {/* Cartão esquerdo — stepper */}
        <View
          style={[
            styles.card,
            styles.cardStepper,
            { backgroundColor: stepperBg, borderColor: stepperBorderColor },
          ]}
        >
          <Pressable
            onPress={decrement}
            disabled={fieldDisabled || value === 0}
            hitSlop={8}
            accessibilityLabel="Diminuir limite"
            accessibilityRole="button"
            style={styles.stepBtn}
          >
            <Text style={[styles.stepIcon, { color: stepperColor }]}>−</Text>
          </Pressable>

          <TextInput
            style={[typography.labelM, styles.count, { color: countColor }]}
            value={draft}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={3}
            editable={!fieldDisabled}
            selectTextOnFocus
            accessibilityLabel="Limite de participantes"
          />

          <Pressable
            onPress={increment}
            disabled={fieldDisabled || value === 999}
            hitSlop={8}
            accessibilityLabel="Aumentar limite"
            accessibilityRole="button"
            style={styles.stepBtn}
          >
            <Text style={[styles.stepIcon, { color: stepperColor }]}>+</Text>
          </Pressable>
        </View>

        {/* Cartão direito — Sem limite + Switch */}
        <View
          style={[
            styles.card,
            styles.cardToggle,
            { backgroundColor: toggleBg, borderColor: toggleBorderColor },
          ]}
        >
          <View style={styles.switchRow}>
            <Text
              style={[
                typography.labelM,
                { color: disabled ? colors.text.disabled : colors.text.primary }
              ]}
            >
              Sem limite
            </Text>
            <CustomSwitch
              value={unlimited}
              onValueChange={onChangeUnlimited}
              disabled={disabled}
            />
          </View>
          <Text
            style={[
              typography.bodyS,
              { color: disabled ? colors.text.disabled : colors.text.secondary }
            ]}
          >
            Qualquer pessoa que vir o evento pode entrar.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  card: {
    borderWidth: BORDER_WIDTH,
    borderRadius: radius.md,
    paddingHorizontal: spacing[16],
    ...elevation[1],
  },
  cardStepper: {
    width: 120,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardToggle: {
    flex: 1,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    gap: spacing[4],
  },
  stepBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  count: {
    minWidth: 32,
    textAlign: 'center',
    padding: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    position: 'absolute',
  },
});

export type { ParticipantLimitProps, ParticipantLimitState } from '@/components/ParticipantLimit/types';
