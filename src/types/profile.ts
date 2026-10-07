/**
 * Contratos da API de perfil — cópia do que as tasks de backend 071, 077 e
 * 229 descrevem. Várias rotas ainda não existem no `develop` do backend; se
 * algo divergir quando subirem, o backend é a fonte de verdade.
 *
 * Os campos ficam em `snake_case`, como em `types/event.ts`.
 */

import type { UserType } from '@/types/event';

/** `GET /users/me`. */
export interface CurrentUserResponse {
  user_id: string;
  email: string;
  user_type: UserType;
  role?: string;
}

/** `GET /users/me/profile` — leitura do perfil de pessoa física para a edição. */
export interface PersonalProfile {
  name?: string | null;
  description?: string | null;
  phone?: string | null;
  /** `YYYY-MM-DD`. */
  date_of_birth?: string | null;
  /** UF, como o cadastro envia. */
  state?: string | null;
  city?: string | null;
  cpf?: string | null;
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

/** `PATCH /users/me/profile` — só os campos que mudaram. Nunca `cpf`. */
export type PersonalProfilePatch = Partial<{
  name: string;
  description: string;
  phone: string;
  date_of_birth: string;
  state: string;
  city: string;
  email: string;
  password: string;
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
