export type ParticipantLimitState = 'Default' | 'Disabled';

export type ParticipantLimitProps = {
  /** Valor atual do contador (inteiro ≥ 0). */
  value: number;
  onChangeValue: (value: number) => void;
  /** Quando true, o Switch "Sem limite" está ligado. */
  unlimited: boolean;
  onChangeUnlimited: (unlimited: boolean) => void;
  /** Desabilita o componente inteiro. */
  disabled?: boolean;
};