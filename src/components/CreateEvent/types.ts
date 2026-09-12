/** Máximo de tags (macro e micro) que um evento pode ter — regra da US. */
export const MAX_TAGS = 5;

export type CreateEventFormData = {
  title: string;
  description: string;
  /** URI local da capa. Não há endpoint de upload ainda. */
  coverUri: string | null;
  /** Ids de tags (macro e micro), no máximo 5. */
  tagIds: string[];
};

/** Campo obrigatório pendente na etapa 1. */
export type MissingField = 'title' | 'tags';
