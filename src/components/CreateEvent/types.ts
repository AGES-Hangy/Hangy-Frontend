/** Máximo de tags (macro e micro) que um evento pode ter — regra da US. */
export const MAX_TAGS = 5;

export type Privacy = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export type CreateEventFormData = {
  // Etapa 1
  title: string;
  description: string;
  /** URI local da capa (`file://` ou `blob:`): só para a prévia, nunca vai para a API. */
  coverUri: string | null;
  /** URL devolvida pelo envio da capa: a única que vai em `cover_photo_url`. */
  coverUrl: string | null;
  /** IDs de tags (macro e micro), no máximo 5. */
  tagIds: string[];
  // Etapa 2
  date: Date | null;
  time: Date | null;
  location: string;
  /** Coordenadas de um local selecionado e confirmado, nunca inferidas do texto. */
  locationCoordinates: { latitude: number; longitude: number } | null;
  /** Bairro e cidade do local selecionado — derivados dele, nunca digitados. */
  locationNeighborhood: string | null;
  locationCity: string | null;
  participantLimit: number;
  unlimited: boolean;
  privacy: Privacy;
  /** IDs dos usuários convidados — obrigatório quando privacy = INVITE_ONLY. */
};

/** Campo obrigatório pendente na etapa 1. */
export type MissingField = 'title' | 'tags';
