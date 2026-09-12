/** Máximo de tags (macro e micro) que um evento pode ter — regra da US. */
export const MAX_TAGS = 5;

export type Privacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export type CreateEventFormData = {
  // Etapa 1
  title: string;
  description: string;
  /** URI local da capa. */
  coverUri: string | null;
  /** IDs de tags (macro e micro), no máximo 5. */
  tagIds: string[];
  // Etapa 2
  date: Date | null;
  time: Date | null;
  location: string;
  participantLimit: number;
  unlimited: boolean;
  privacy: Privacy;
  /** IDs dos usuários convidados — obrigatório quando privacy = INVITE_ONLY. */
  inviteeIds: string[];
};

/** Campo obrigatório pendente na etapa 1. */
export type MissingField = 'title' | 'tags';
