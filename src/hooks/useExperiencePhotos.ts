import { useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import { useImageUpload, type PickedImage } from '@/hooks/useImageUpload';
import { apiFetch } from '@/utils/http';

/** `POST /events/{event_id}/experiences` — 201 (task 073 [BE]). */
interface ExperienceResponse {
  experience_id: string;
  event_id: string;
  description: string;
  images: { photo_id: string; photo_url: string; created_at: string }[];
  created_at: string;
}

/** `POST /experiences/{experience_id}/images` — 201 (task 225 [BE]). */
interface ExperienceImageResponse {
  photo_id: string;
  photo_url: string;
  created_at: string;
}

/** Limite de `description` no backend (`CreateExperienceInput`). */
const DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Foto do registro do usuário nesta tela. `uri` é a prévia local, mostrada
 * de forma otimista enquanto `photoId` não existe — só depois do 201 a foto é
 * do servidor e pode ser removida.
 */
export interface ExperiencePhoto {
  localId: string;
  uri: string;
  /** Andamento do envio, de 0 a 1. */
  progress: number;
  photoId: string | null;
}

let nextLocalId = 0;

/**
 * Fotos do registro do usuário num evento encerrado: seleção, `POST` da
 * experiência, envio do arquivo e `DELETE` da foto.
 *
 * ```tsx
 * const { photos, pickPhoto, uploadPhoto, removePhoto } = useExperiencePhotos(id, descricao);
 * ```
 *
 * Os erros sobem como `ApiError` para a tela decidir o que mostrar, como no
 * `useParticipation`. O 401 é tratado no cliente HTTP.
 */
export function useExperiencePhotos(eventId: string | undefined, description: string) {
  const { pickImage, uploadImage, error: pickError } = useImageUpload({ aspect: null });
  const [photos, setPhotos] = useState<ExperiencePhoto[]>([]);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  // O backend aceita uma experiência por participante: criada a primeira vez,
  // as fotos seguintes vão para ela. Guarda a promessa, não o id, para dois
  // envios seguidos não dispararem dois `POST` (o segundo levaria 409).
  const experienceId = useRef<Promise<string> | null>(null);
  // A tela é reaproveitada entre eventos: um envio do evento anterior que
  // termine depois da troca não pode aparecer no evento novo.
  const currentEventId = useRef(eventId);
  // Ao sair da tela o `useImageUpload` aborta os envios; esse aborto não é
  // erro do usuário e não deve virar toast.
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    currentEventId.current = eventId;
    experienceId.current = null;
    setPhotos([]);
  }, [eventId]);

  function updatePhoto(localId: string, changes: Partial<ExperiencePhoto>) {
    setPhotos((list) => list.map((photo) => (photo.localId === localId ? { ...photo, ...changes } : photo)));
  }

  function ensureExperience(forEventId: string) {
    if (!experienceId.current) {
      const request = apiFetch<ExperienceResponse>(endpoints.eventExperiences(forEventId), {
        method: 'POST',
        body: JSON.stringify({ description: description.slice(0, DESCRIPTION_MAX_LENGTH) }),
      }).then((created) => created.experience_id);
      // Falhou: a próxima tentativa cria de novo.
      request.catch(() => {
        if (experienceId.current === request) experienceId.current = null;
      });
      experienceId.current = request;
    }
    return experienceId.current;
  }

  /**
   * Mostra a miniatura na hora e envia. Se a API falhar, a miniatura sai e o
   * erro sobe — reverter é responsabilidade daqui, não da tela.
   */
  async function uploadPhoto(picked: PickedImage) {
    const forEventId = currentEventId.current;
    if (!forEventId) return;

    const localId = `local-${++nextLocalId}`;
    setPhotos((list) => [...list, { localId, uri: picked.uri, progress: 0, photoId: null }]);

    try {
      const targetExperienceId = await ensureExperience(forEventId);
      const { promise } = uploadImage<ExperienceImageResponse>(
        endpoints.experienceImages(targetExperienceId),
        picked,
        (progress) => updatePhoto(localId, { progress }),
      );
      const uploaded = await promise;
      if (currentEventId.current !== forEventId) return;
      updatePhoto(localId, { progress: 1, photoId: uploaded.photo_id });
    } catch (error) {
      setPhotos((list) => list.filter((photo) => photo.localId !== localId));
      if (!isMounted.current || currentEventId.current !== forEventId) return;
      throw error;
    }
  }

  /** Esquece a experiência guardada — o servidor disse que ela não existe mais. */
  function resetExperience() {
    experienceId.current = null;
  }

  /** `DELETE` da foto; sai da lista quando o servidor confirma. */
  async function removePhoto(photoId: string) {
    setRemovingPhotoId(photoId);
    try {
      await apiFetch<void>(endpoints.experienceImage(photoId), { method: 'DELETE' });
      setPhotos((list) => list.filter((photo) => photo.photoId !== photoId));
    } finally {
      setRemovingPhotoId(null);
    }
  }

  /** Tira a foto da lista sem chamar a API — para o 404 `Photo not found`. */
  function dropPhoto(photoId: string) {
    setPhotos((list) => list.filter((photo) => photo.photoId !== photoId));
  }

  return {
    photos,
    pickPhoto: pickImage,
    pickError,
    uploadPhoto,
    removePhoto,
    dropPhoto,
    resetExperience,
    removingPhotoId,
  };
}
