import type { DatePreset, FilterPanelVariant, FilterValue, ResultType } from '@/components/FilterPanel/types';

export const EMPTY_FILTER_VALUE: FilterValue = { tagIds: [] };

const pad = (n: number) => String(n).padStart(2, '0');

/** `Date` → `YYYY-MM-DD` no fuso do aparelho (não em UTC, que trocaria o dia à noite). */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → `Date` à meia-noite local. `undefined` se a string não for uma data válida. */
export function fromDateKey(key: string | undefined): Date | undefined {
  const match = key ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(key) : null;
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Intervalo de um atalho de data, a partir de `now`. "Este fim de semana" é o
 * sábado e o domingo desta semana; no domingo, só o próprio domingo.
 * `custom` não tem intervalo próprio — vem dos campos De/Até.
 */
export function resolveDatePreset(
  preset: Exclude<DatePreset, 'custom'>,
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'today') return { dateFrom: toDateKey(today), dateTo: toDateKey(today) };
  if (preset === 'tomorrow') {
    const tomorrow = addDays(today, 1);
    return { dateFrom: toDateKey(tomorrow), dateTo: toDateKey(tomorrow) };
  }
  const weekday = today.getDay(); // 0 = domingo, 6 = sábado
  if (weekday === 0) return { dateFrom: toDateKey(today), dateTo: toDateKey(today) };
  const saturday = addDays(today, 6 - weekday);
  return { dateFrom: toDateKey(saturday), dateTo: toDateKey(addDays(saturday, 1)) };
}

/**
 * Erro do intervalo escolhido em "Escolher data", ou `null` se ele vale.
 * Datas no passado não fazem sentido para buscar evento, e o fim não pode
 * vir antes do início.
 */
export function validateDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  now: Date = new Date(),
): { field: 'dateFrom' | 'dateTo'; message: string } | null {
  const today = toDateKey(now);
  // `YYYY-MM-DD` compara certo como string.
  if (dateFrom && dateFrom < today) return { field: 'dateFrom', message: 'Escolha a partir de hoje.' };
  if (dateTo && dateTo < today) return { field: 'dateTo', message: 'Escolha a partir de hoje.' };
  if (dateFrom && dateTo && dateTo < dateFrom) return { field: 'dateTo', message: 'Precisa ser depois do início.' };
  return null;
}

/** Tipos de resultado que cada bloco filtra. Tags valem para todos. */
const DATE_APPLIES_TO: ResultType[] = ['events'];
const DISTANCE_APPLIES_TO: ResultType[] = ['events', 'businesses'];

/** O bloco ainda tem efeito com o "Mostrar" atual? Sem tipo escolhido, aparecem todos. */
export function blockApplies(block: 'date' | 'distance', resultType: ResultType | undefined): boolean {
  if (!resultType) return true;
  return (block === 'date' ? DATE_APPLIES_TO : DISTANCE_APPLIES_TO).includes(resultType);
}

/**
 * O que o `onApply` entrega: atalhos de data recalculados para `now`, campos
 * de outra variante ou sem efeito com o "Mostrar" atual removidos, e
 * "Escolher data" sem nenhuma data desfeito.
 */
export function normalizeFilterValue(
  draft: FilterValue,
  variant: FilterPanelVariant,
  now: Date = new Date(),
): FilterValue {
  const resultType = variant === 'Search' ? draft.resultType : undefined;
  const result: FilterValue = { tagIds: [...new Set(draft.tagIds)] };
  if (resultType) result.resultType = resultType;
  if (variant === 'Search' && draft.maxDistanceKm && blockApplies('distance', resultType)) {
    result.maxDistanceKm = draft.maxDistanceKm;
  }

  if (draft.datePreset && blockApplies('date', resultType)) {
    if (draft.datePreset !== 'custom') {
      Object.assign(result, { datePreset: draft.datePreset }, resolveDatePreset(draft.datePreset, now));
    } else if (draft.dateFrom || draft.dateTo) {
      result.datePreset = 'custom';
      if (draft.dateFrom) result.dateFrom = draft.dateFrom;
      if (draft.dateTo) result.dateTo = draft.dateTo;
    }
  }
  return result;
}

/** Quantos blocos estão filtrando — para o contador do botão de filtro. */
export function countActiveFilters(value: FilterValue): number {
  return [
    value.datePreset !== undefined && (value.datePreset !== 'custom' || !!value.dateFrom || !!value.dateTo),
    value.resultType !== undefined,
    value.maxDistanceKm !== undefined,
    value.tagIds.length > 0,
  ].filter(Boolean).length;
}
