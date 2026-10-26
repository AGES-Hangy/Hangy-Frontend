import { TextField } from '@/components/TextField';
import { durationFromPickerValue, durationToPickerValue } from '@/utils/eventDuration';

export type EventDurationProps = {
  /** Duração em minutos; `null` enquanto não foi escolhida. */
  value: number | null;
  onChange: (minutes: number | null) => void;
  error?: string;
  disabled?: boolean;
};

/**
 * Duração do evento em horas e minutos: no iOS, o seletor de timer do
 * sistema; no Android, o relógio em 24 h. O `end_date` enviado à API é o
 * início mais esta duração, e é ele que define quando o evento passa a "já
 * aconteceu".
 */
export function EventDuration({ value, onChange, error, disabled = false }: EventDurationProps) {
  return (
    <TextField
      type="Date"
      dateMode="time"
      isDuration
      label="Duração"
      required
      helper={error ? undefined : 'Horas e minutos'}
      error={error}
      reserveMessageSpace
      dateValue={value === null ? undefined : durationToPickerValue(value)}
      onChangeDate={(date) => onChange(date ? durationFromPickerValue(date) : null)}
      placeholder="00:00"
      accessibilityLabel="Duração do evento em horas e minutos, obrigatório"
      disabled={disabled}
    />
  );
}
