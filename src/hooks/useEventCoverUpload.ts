import { endpoints } from '@/constants/api';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { ImageUploadOptions } from '@/hooks/useImageUpload';

/** Contrato da task 276: `POST /uploads/event-covers` devolve `{ cover_photo_url }`. */
const EVENT_COVER_UPLOAD: ImageUploadOptions = {
  endpoint: endpoints.eventCovers(),
  urlField: 'cover_photo_url',
  aspect: [16, 9],
  messages: {
    invalidFile: 'Arquivo inválido — use JPG ou PNG\naté 5 MB, na proporção 16:9',
    permissionDenied: 'Permita o acesso às fotos para escolher uma capa',
    failed: 'Não foi possível enviar a capa. Tente de novo.',
    connection: 'Não foi possível enviar a capa. Verifique sua conexão.',
  },
};

/** Envio da capa de evento, compartilhado por Criar e Editar evento. */
export function useEventCoverUpload() {
  return useImageUpload(EVENT_COVER_UPLOAD);
}
