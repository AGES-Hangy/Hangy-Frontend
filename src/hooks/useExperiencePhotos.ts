import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import { useImageUpload, type PickedImage } from '@/hooks/useImageUpload';
import { ApiError, apiFetch } from '@/utils/http';

interface ExperienceImageResponse {
  photo_id: string;
  photo_url: string;
  created_at: string;
}

/** Corpo do `POST`, do `GET .../experiences/me` e do `PATCH /experiences/{id}`. */
interface ExperienceResponse {
  experience_id: string;
  description: string;
  images: ExperienceImageResponse[];
}

/** Limite do backend para o texto da experiência. */
export const EXPERIENCE_DESCRIPTION_MAX_LENGTH = 1000;

export interface ExperiencePhoto {
  localId: string;
  uri: string;
  progress: number;
  photoId: string | null;
}

/** A experiência do usuário neste evento, como o servidor a conhece. */
export interface Experience {
  id: string;
  description: string;
}

/**
 * `loading`: ainda perguntando ao servidor; `none`: o usuário não tem
 * experiência neste evento (o primeiro envio pede a descrição); `error`: não
 * deu para saber — o primeiro envio também pede a descrição, e um `409` no
 * `POST` cai de volta no `GET`.
 */
export type ExperienceStatus = 'loading' | 'ready' | 'none' | 'error';

let nextLocalId = 0;

function toPhotos(images: ExperienceImageResponse[]): ExperiencePhoto[] {
  return images.map((image) => ({
    localId: `server-${image.photo_id}`,
    uri: image.photo_url,
    progress: 1,
    photoId: image.photo_id,
  }));
}

/**
 * Experiência do usuário num evento encerrado: lê a existente ao entrar, cria
 * uma só vez (`POST /events/{id}/experiences`, com a descrição) e depois só
 * envia fotos para `POST /experiences/{id}/images`.
 */
export function useExperiencePhotos(eventId: string | undefined) {
  const {
    pickImage, uploadImage, cancelUploads, releaseImage, isPicking, error: pickError,
  } = useImageUpload({
    resizeOversized: true,
    messages: {
      invalidFile: 'Arquivo inválido — use JPG ou PNG\naté 5 MB',
      permissionDenied: 'Permita o acesso às fotos para escolher uma foto',
      failed: 'Não foi possível preparar a imagem. Tente de novo.',
      connection: 'Sem conexão com a internet',
      uploading: 'Enviando foto',
      uploaded: 'Foto enviada',
    },
  });
  const [photos, setPhotos] = useState<ExperiencePhoto[]>([]);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [experienceStatus, setExperienceStatus] = useState<ExperienceStatus>('loading');
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const experienceRequest = useRef<{ eventId: string; request: Promise<Experience> } | null>(null);
  const scope = useRef({ eventId, version: 0, active: false });
  const pendingImages = useRef(new Set<PickedImage>());
  const removing = useRef<string | null>(null);

  function isCurrent(visit: typeof scope.current) {
    return scope.current.active && scope.current.version === visit.version;
  }

  function remember(forEventId: string, found: ExperienceResponse) {
    const known = { id: found.experience_id, description: found.description };
    experienceRequest.current = { eventId: forEventId, request: Promise.resolve(known) };
    return known;
  }

  /** `null` quando o usuário ainda não tem experiência neste evento. */
  async function fetchMine(forEventId: string): Promise<ExperienceResponse | null> {
    try {
      return await apiFetch<ExperienceResponse>(endpoints.myEventExperience(forEventId));
    } catch (error) {
      if (error instanceof ApiError && error.is(404, 'Experience not found')) return null;
      throw error;
    }
  }

  // As tabs continuam montadas ao perder o foco: desmontagem sozinha não cancela a visita.
  useFocusEffect(useCallback(() => {
    const visit = { eventId, version: scope.current.version + 1, active: true };
    scope.current = visit;
    experienceRequest.current = null;
    removing.current = null;
    setRemovingPhotoId(null);
    setPhotos([]);
    setExperience(null);
    setExperienceStatus('loading');

    if (eventId) {
      fetchMine(eventId)
        .then((found) => {
          if (scope.current.version !== visit.version) return;
          if (!found) {
            setExperienceStatus('none');
            return;
          }
          setExperience(remember(eventId, found));
          setExperienceStatus('ready');
          setPhotos(toPhotos(found.images));
        })
        .catch(() => {
          if (scope.current.version === visit.version) setExperienceStatus('error');
        });
    }

    return () => {
      scope.current = { ...scope.current, version: scope.current.version + 1, active: false };
      cancelUploads();
      pendingImages.current.clear();
    };
    // `fetchMine`/`remember` só usam refs e a API: não precisam reiniciar a visita.
  }, [eventId, cancelUploads]));

  async function pickPhoto() {
    const visit = scope.current;
    if (!visit.active) return null;
    const picked = await pickImage();
    if (!isCurrent(visit)) {
      if (picked) releaseImage(picked.uri);
      return null;
    }
    return picked;
  }

  /**
   * Id da experiência, criando-a só quando ainda não existe. Já existindo no
   * servidor (`409`), lê a de lá em vez de falhar.
   */
  function ensureExperience(forEventId: string, description: string | undefined) {
    if (experienceRequest.current?.eventId !== forEventId) {
      const create = async (): Promise<Experience> => {
        if (description === undefined) {
          const found = await fetchMine(forEventId);
          if (!found) throw new ApiError('http', 404, 'Experience not found');
          return remember(forEventId, found);
        }
        try {
          const created = await apiFetch<ExperienceResponse>(endpoints.eventExperiences(forEventId), {
            method: 'POST',
            body: JSON.stringify({ description: description.trim().slice(0, EXPERIENCE_DESCRIPTION_MAX_LENGTH) }),
          });
          return remember(forEventId, created);
        } catch (error) {
          if (!(error instanceof ApiError) || !error.is(409, 'Experience already exists')) throw error;
          const found = await fetchMine(forEventId);
          if (!found) throw error;
          return remember(forEventId, found);
        }
      };
      const request = create();
      experienceRequest.current = { eventId: forEventId, request };
      request.catch(() => {
        if (experienceRequest.current?.request === request) experienceRequest.current = null;
      });
    }
    return experienceRequest.current.request;
  }

  /**
   * Envia uma foto. `description` só é usada se a experiência ainda precisar
   * ser criada. Toques repetidos no mesmo retry não criam duas fotos.
   */
  async function uploadPhoto(picked: PickedImage, description?: string) {
    const visit = scope.current;
    if (!visit.active || !visit.eventId || visit.eventId !== eventId || pendingImages.current.has(picked)) return;
    pendingImages.current.add(picked);
    const localId = `local-${++nextLocalId}`;
    setPhotos((list) => [...list, { localId, uri: picked.uri, progress: 0, photoId: null }]);
    const update = (changes: Partial<ExperiencePhoto>) => {
      if (isCurrent(visit)) {
        setPhotos((list) => list.map((photo) => photo.localId === localId ? { ...photo, ...changes } : photo));
      }
    };
    try {
      const known = await ensureExperience(visit.eventId, description);
      // A criação pode terminar depois de voltar, mudar de evento ou fechar a tela.
      if (!isCurrent(visit)) return;
      setExperience(known);
      setExperienceStatus('ready');
      const uploaded = await uploadImage<ExperienceImageResponse>(
        endpoints.experienceImages(known.id), picked,
        (progress) => update({ progress }),
      ).promise;
      update({ progress: 1, photoId: uploaded.photo_id, uri: uploaded.photo_url });
      releaseImage(picked.uri);
    } catch (error) {
      if (!isCurrent(visit)) return;
      setPhotos((list) => list.filter((photo) => photo.localId !== localId));
      throw error;
    } finally {
      pendingImages.current.delete(picked);
    }
  }

  /** A experiência guardada sumiu no servidor: o próximo envio pede a descrição de novo. */
  function resetExperience() {
    experienceRequest.current = null;
    setExperience(null);
    setExperienceStatus('none');
  }

  /** `PATCH /experiences/{id}` — troca a descrição sem mexer nas fotos. */
  async function updateDescription(description: string) {
    const visit = scope.current;
    if (!experience || !visit.eventId) return;
    const updated = await updateExperienceDescription(experience.id, description);
    if (!isCurrent(visit)) return;
    setExperience(remember(visit.eventId, updated));
  }

  async function removePhoto(photoId: string): Promise<boolean> {
    const visit = scope.current;
    if (!visit.active || removing.current !== null) return false;
    removing.current = photoId;
    setRemovingPhotoId(photoId);
    try {
      await apiFetch<void>(endpoints.experienceImage(photoId), { method: 'DELETE' });
      if (!isCurrent(visit)) return false;
      setPhotos((list) => list.filter((photo) => photo.photoId !== photoId));
      return true;
    } catch (error) {
      if (!isCurrent(visit)) throw new ApiError('cancelled', null, null);
      throw error;
    } finally {
      if (isCurrent(visit)) {
        removing.current = null;
        setRemovingPhotoId(null);
      }
    }
  }

  function dropPhoto(photoId: string) {
    setPhotos((list) => list.filter((photo) => photo.photoId !== photoId));
  }

  return {
    photos, pickPhoto, releasePhoto: releaseImage, pickError: scope.current.active ? pickError : null, isPicking,
    uploadPhoto, removePhoto,
    dropPhoto, resetExperience, removingPhotoId, experience, experienceStatus, updateDescription,
  };
}

/** Também usado pela galeria do perfil, que já tem o `experience_id` da foto. */
export function updateExperienceDescription(experienceId: string, description: string) {
  return apiFetch<ExperienceResponse>(endpoints.experience(experienceId), {
    method: 'PATCH',
    body: JSON.stringify({ description: description.trim().slice(0, EXPERIENCE_DESCRIPTION_MAX_LENGTH) }),
  });
}
