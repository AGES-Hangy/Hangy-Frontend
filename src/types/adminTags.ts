/**
 * Contrato de `POST/PATCH/DELETE /admin/tags` (task 264 [FE]). Em qualquer divergência,
 * o backend é a fonte de verdade.
 */

export interface CreateTagPayload {
  name: string;
  /** `null` cria categoria (macro); preenchido cria tag (micro) dentro dela. */
  parent_id: string | null;
}

export interface RenameTagPayload {
  name: string;
}

/** Resposta `201` do `POST /admin/tags`. */
export interface CreatedTag {
  tag_id: string;
  name: string;
  parent_id: string | null;
  type: 'MACRO' | 'MICRO';
}