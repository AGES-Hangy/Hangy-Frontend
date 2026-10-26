import type { EventStatus } from '@/types/event';

const MINUTE_MS = 60 * 1000;

/** Maior duração que o seletor de horas e minutos consegue mostrar (23:59). */
export const MAX_EVENT_DURATION_MINUTES = 23 * 60 + 59;

/** `end_date` enviado à API: início + duração escolhida. */
export function endDateFrom(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * MINUTE_MS);
}

/** Duração de um evento salvo, em minutos. */
export function durationMinutesBetween(eventDate: string, endDate: string): number {
  return Math.round((new Date(endDate).getTime() - new Date(eventDate).getTime()) / MINUTE_MS);
}

/**
 * O seletor de duração é o de horário: ele recebe e devolve um `Date`, do
 * qual só valem as horas e os minutos.
 */
export function durationToPickerValue(durationMinutes: number): Date {
  const minutes = Math.min(durationMinutes, MAX_EVENT_DURATION_MINUTES);
  const value = new Date();
  value.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return value;
}

export function durationFromPickerValue(value: Date): number {
  return value.getHours() * 60 + value.getMinutes();
}

/** Obrigatória e maior que zero: o backend exige `end_date` depois do início. */
export function isValidDuration(durationMinutes: number | null): durationMinutes is number {
  return durationMinutes !== null && durationMinutes > 0;
}

/**
 * Mesma regra do backend para "evento encerrado": status `FINISHED` ou o
 * horário de término já passou. Ninguém marca o evento como `FINISHED` à mão.
 */
export function hasEventEnded(
  event: { status: EventStatus; end_date: string },
  now: number = Date.now(),
): boolean {
  return event.status === 'FINISHED' || new Date(event.end_date).getTime() <= now;
}
