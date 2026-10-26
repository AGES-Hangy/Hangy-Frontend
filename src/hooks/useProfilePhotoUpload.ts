import { endpoints } from '@/constants/api';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { ImageUploadOptions } from '@/hooks/useImageUpload';

/** `POST /users/me/photo` devolve `{ photo_url }` e já grava a foto no perfil. */
const PROFILE_PHOTO_UPLOAD: ImageUploadOptions = {
  endpoint: endpoints.profilePhoto(),
  urlField: 'photo_url',
  aspect: [1, 1],
  resizeOversized: true,
  messages: {
    invalidFile: 'Arquivo inválido — use JPG ou PNG\naté 5 MB',
    permissionDenied: 'Permita o acesso às fotos para escolher uma foto',
    failed: 'Não foi possível trocar a foto. Tente de novo.',
    connection: 'Não foi possível trocar a foto. Verifique sua conexão.',
    uploading: 'Enviando a foto.',
    uploaded: 'Foto atualizada.',
  },
};

/** Troca da foto de perfil (pessoa física) ou logo (estabelecimento). */
export function useProfilePhotoUpload() {
  return useImageUpload(PROFILE_PHOTO_UPLOAD);
}
