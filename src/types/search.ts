import type { EventPrivacy, LocationPrecision } from '@/types/event';

/**
 * Contratos de `GET /search` (task 121 [BE]) — busca categorizada em eventos,
 * estabelecimentos e pessoas, com filtros de tags e intervalo de datas.
 *
 * Campos opcionais da API são tipados como `string | null` / `number | null`
 * para o compilador cobrar o tratamento antes de renderizar.
 */

export interface SearchAppliedFilters {
  tag_ids: string[];
  date_from: string | null;
  date_to: string | null;
}

export interface SearchEventItem {
  event_id: string;
  title: string;
  event_date: string;
  /** Endereço em `EXACT`; bairro em `APPROXIMATE` (`null` quando ausente). */
  location_name: string | null;
  location_precision?: LocationPrecision;
  privacy: EventPrivacy;
  /** `true` em evento privado do qual o visitante ainda não participa. */
  is_preview: boolean;
  /** `null` quando `is_preview=true` ou quando o evento não tem descrição. */
  description: string | null;
  /** `null` quando `is_preview=true` — nunca renderizar como "0 confirmados". */
  participants_count: number | null;
  cover_photo_url?: string | null;
}

export interface SearchBusinessItem {
  user_id: string;
  business_name: string | null;
  name: string | null;
  description?: string | null;
  address?: string | null;
  photo_url?: string | null;
}

export interface SearchUserItem {
  user_id: string;
  name: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  photo_url?: string | null;
}

export interface SearchBlock<T> {
  items: T[];
  total: number;
  has_more: boolean;
}

export interface SearchResponse {
  query: string | null;
  applied_filters: SearchAppliedFilters;
  events: SearchBlock<SearchEventItem>;
  businesses: SearchBlock<SearchBusinessItem>;
  users: SearchBlock<SearchUserItem>;
}
