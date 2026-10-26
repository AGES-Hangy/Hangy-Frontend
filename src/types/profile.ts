/**
 * Contratos da API de perfil. As rotas de pessoa física e a leitura do
 * estabelecimento espelham os DTOs do backend; o `PATCH /businesses/me`
 * (task 229) ainda não existe no `develop` do backend e segue a descrição da
 * task. Em qualquer divergência, o backend é a fonte de verdade.
 *
 * Os campos ficam em `snake_case`, como em `types/event.ts`.
 */

import type { UserType } from '@/types/event';

/** `GET /users/me`. */
export interface CurrentUserResponse {
  id: string;
  email: string;
  user_type: UserType;
  name?: string | null;
  profile?: CurrentUserPersonalData | CurrentUserBusinessData | null;
}

/** `profile` de `GET /users/me` numa conta de pessoa física. */
export interface CurrentUserPersonalData {
  /** `YYYY-MM-DD`. */
  date_of_birth: string;
  /** UF, como o cadastro envia. */
  state: string;
  city: string;
  photo_url?: string | null;
}

/** `profile` de `GET /users/me` numa conta de estabelecimento. */
export interface CurrentUserBusinessData {
  cnpj: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
}

/** `GET /users/me/profile`: o perfil vem dentro de `profile`, ao lado dos contadores das abas. */
export interface PersonalProfileResponse {
  profile: {
    id: string;
    name: string | null;
    description: string | null;
    photo_url: string | null;
    tags: Array<{ id: string; name: string }>;
    connections_count: number;
  };
  /** `created`: eventos publicados que a pessoa organizou, futuros ou encerrados. */
  counts: { past: number; confirmed: number; created: number; photos: number };
}

/**
 * Perfil de pessoa física no formato que a edição usa — montado a partir de
 * `GET /users/me/profile` (nome e bio) e de `GET /users/me` (e-mail,
 * nascimento, estado e cidade). Não é a resposta de uma rota.
 */
export interface PersonalProfile {
  name?: string | null;
  description?: string | null;
  /** `YYYY-MM-DD`. */
  date_of_birth?: string | null;
  /** UF, como o cadastro envia. */
  state?: string | null;
  city?: string | null;
  email?: string | null;
}

/** `GET /businesses/me` (task 077). */
export interface BusinessProfile {
  business_name?: string | null;
  cnpj?: string | null;
  description?: string | null;
  address?: string | null;
  location?: { latitude: number; longitude: number } | null;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
}

/**
 * `PATCH /users/me/profile` — só os campos que mudaram. O backend ignora em
 * silêncio qualquer outro campo (`extra="ignore"`), então nada além destes
 * pode ser enviado: a resposta seria sucesso sem gravar. `description: null`
 * limpa a bio.
 */
export type PersonalProfilePatch = Partial<{
  name: string;
  description: string | null;
  state: string;
  city: string;
}>;

/** `PATCH /businesses/me` — só os campos que mudaram. Nunca `cnpj`. */
export type BusinessProfilePatch = Partial<{
  business_name: string;
  description: string;
  phone: string;
  instagram: string;
  address: string;
  location: { latitude: number; longitude: number };
  email: string;
  password: string;
}>;

/** Item de `GET`/`PUT /users/me/tags`: micro com a macro em `parent`. */
export interface UserTag {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
}

/** Item de `GET /users/me/blocked` (task 236 [BE]). */
export interface BlockedUser {
  user_id: string;
  name: string;
  photo_url: string | null;
  /** ISO 8601. */
  blocked_at: string;
}

/** `GET /users/me/blocked`: paginado por cursor, `next_cursor: null` na última página. */
export interface BlockedUsersPage {
  items: BlockedUser[];
  next_cursor: string | null;
}

/** Item de `GET /businesses/me/followers` (task 282 [BE]). */
export interface Follower {
  user_id: string;
  name: string;
  photo_url: string | null;
  tags: Array<{ id: string; name: string }>;
}

/**
 * `GET /businesses/me/followers`: paginado por cursor, `next_cursor: null` na
 * última página. `total` é o número geral de seguidores, sem o filtro do `q`.
 */
export interface FollowersResponse {
  items: Follower[];
  total: number;
  next_cursor: string | null;
}
