import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { ParticipantLimit } from '@/components/ParticipantLimit';
import { ProfileTabs } from '@/components/ProfileTabs';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { CreateEventFormData, Privacy } from '@/components/CreateEvent/types';

const PRIVACY_ITEMS = [
  { value: 'PUBLIC' as Privacy, label: 'Público' },
  { value: 'PRIVATE' as Privacy, label: 'Privado' },
  { value: 'INVITE_ONLY' as Privacy, label: 'Por convite' },
] as const;

const PRIVACY_DESCRIPTION: Record<Privacy, string> = {
  PUBLIC: 'Aparece no feed e no Ao Vivo para quem estiver por perto.',
  PRIVATE: 'Só aparece para quem você convidar diretamente.',
  INVITE_ONLY: 'Só aparece para quem receber o link ou convite.',
};

export type Step2Handle = {
  submit: () => boolean;
};

export type Step2Props = {
  data: CreateEventFormData;
  onChangeDate: (v: Date) => void;
  onChangeTime: (v: Date) => void;
  onChangeLocation: (v: string) => void;
  onChangeParticipantLimit: (v: number) => void;
  onChangeUnlimited: (v: boolean) => void;
  onChangePrivacy: (v: Privacy) => void;
  isPublishing: boolean;
  publishError: string | null;
};

type MissingField = 'dateRow' | 'location';

const FIELD_SCROLL_MARGIN = spacing[16];

function isFutureDate(date: Date | null, time: Date | null): boolean {
  if (!date) return true;
  const combined = new Date(date);
  if (time) {
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    combined.setHours(0, 0, 0, 0);
  }
  return combined.getTime() > Date.now();
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={[typography.labelM, styles.fieldLabel]}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

export const Step2 = forwardRef<Step2Handle, Step2Props>(function Step2(
  {
    data,
    onChangeDate,
    onChangeTime,
    onChangeLocation,
    onChangeParticipantLimit,
    onChangeUnlimited,
    onChangePrivacy,
    isPublishing,
    publishError,
  },
  ref,
) {
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fieldPositions = useRef<Record<MissingField, number>>({
    dateRow: 0,
    location: 0,
  });

  const isDateMissing = !data.date;
  const isTimeMissing = !data.time;
  const isLocationMissing = data.location.trim().length === 0;
  const isDateInPast = data.date !== null && !isFutureDate(data.date, data.time);

  const showDateRowError = submitAttempted && (isDateMissing || isTimeMissing || isDateInPast);
  const showLocationError = submitAttempted && isLocationMissing;

  const rememberPosition = (field: MissingField) => (event: LayoutChangeEvent) => {
    fieldPositions.current[field] = event.nativeEvent.layout.y;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      setSubmitAttempted(true);

      if (isDateMissing || isDateInPast || isTimeMissing || isLocationMissing) {
        const firstMissing: MissingField =
          isDateMissing || isDateInPast || isTimeMissing ? 'dateRow' : 'location';

        const messages: string[] = [];
        if (isDateMissing) messages.push('data');
        else if (isDateInPast) messages.push('data futura');
        if (isTimeMissing) messages.push('horário');
        if (isLocationMissing) messages.push('local');

        requestAnimationFrame(() => {
          const targetY = Math.max(fieldPositions.current[firstMissing] - FIELD_SCROLL_MARGIN, 0);
          void targetY;
          AccessibilityInfo.announceForAccessibility(`Preencha: ${messages.join(', ')}.`);
        });

        return false;
      }

      return true;
    },
  }));

  return (
    <View style={styles.container}>
      {publishError ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Icon name="triangle-alert" size={16} color={palette.error.default} />
          <Text style={[typography.bodyS, styles.errorBannerText]}>{publishError}</Text>
        </View>
      ) : null}

      <View onLayout={rememberPosition('dateRow')}>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <FieldLabel label="Data do evento" required />
            <TextField
              type="Date"
              dateMode="date"
              dateValue={data.date ?? undefined}
              onChangeDate={onChangeDate}
              accessibilityLabel="Data do evento, obrigatório"
              disabled={isPublishing}
              style={styles.dateInput}
            />
          </View>

          <View style={styles.timeField}>
            <FieldLabel label="Horário" required />
            <TextField
              type="Date"
              dateMode="time"
              dateValue={data.time ?? undefined}
              onChangeDate={onChangeTime}
              accessibilityLabel="Horário do evento, obrigatório"
              disabled={isPublishing}
              style={styles.dateInput}
            />
          </View>
        </View>

        {showDateRowError ? (
          <View style={styles.dateError} accessibilityRole="alert">
            <Icon name="circle-alert" size={14} color={palette.error.default} />
            <Text style={[typography.bodyS, { color: palette.error.default, flex: 1 }]}>
              {isDateInPast
                ? 'Essa data já passou. Escolha o dia de hoje ou uma data futura.'
                : isDateMissing
                  ? 'Selecione uma data.'
                  : 'Selecione um horário.'}
            </Text>
          </View>
        ) : null}
      </View>

      <View onLayout={rememberPosition('location')}>
        <FieldLabel label="Local" required />
        <TextField
          type="Location"
          value={data.location}
          onChangeText={onChangeLocation}
          placeholder="Digite o local do evento"
          error={showLocationError ? 'Informe o local do evento' : undefined}
          reserveMessageSpace
          accessibilityLabel="Local do evento, obrigatório"
          disabled={isPublishing}
        />
      </View>

      <ParticipantLimit
        value={data.participantLimit}
        onChangeValue={onChangeParticipantLimit}
        unlimited={data.unlimited}
        onChangeUnlimited={onChangeUnlimited}
        disabled={isPublishing}
      />

      <View style={styles.section}>
        <Text style={[typography.labelM, styles.fieldLabel]}>Visibilidade</Text>

        <ProfileTabs
          items={PRIVACY_ITEMS}
          value={data.privacy}
          onChange={onChangePrivacy}
        />

        <Text style={[typography.bodyS, { color: colors.text.secondary, marginTop: spacing[8] }]}>
          {PRIVACY_DESCRIPTION[data.privacy]}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing[24],
  },
  fieldLabel: {
    color: palette.neutral[700],
    marginBottom: spacing[4],
  },
  required: {
    color: palette.error.default,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  dateField: {
    flex: 3,
    minWidth: 0,
  },
  timeField: {
    flex: 2,
    minWidth: 0,
  },
  dateInput: {
    minWidth: 0,
  },
  dateError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  section: {
    gap: spacing[4],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: palette.error.bg,
    borderRadius: radius.sm,
    padding: spacing[12],
  },
  errorBannerText: {
    flex: 1,
    color: palette.error.default,
  },
});
