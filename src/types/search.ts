/**
 * Contratos de `GET /search/*`. Os campos ficam em `snake_case`, como o
 * backend devolve; em qualquer divergência, o backend é a fonte de verdade.
 */

/** Item de `GET /search/businesses` (task 237 [BE]). */
export interface BusinessSearchItem {
  user_id: string;
  business_name: string | null;
  photo_url: string | null;
  city: string | null;
  is_following: boolean;
}

/** `GET /search/businesses`. `total` é o número geral de resultados. */
export interface BusinessSearchResponse {
  items: BusinessSearchItem[];
  next_cursor: string | null;
  total: number;
}
