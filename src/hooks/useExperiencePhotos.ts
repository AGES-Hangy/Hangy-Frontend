import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import { useImageUpload, type PickedImage } from '@/hooks/useImageUpload';
import { ApiError, apiFetch } from '@/utils/http';

interface ExperienceResponse {
  experience_id: string;
}

interface ExperienceImageResponse {
  photo_id: string;
  photo_url: string;
  created_at: string;
}

const DESCRIPTION_MAX_LENGTH = 1000;

export interface ExperiencePhoto {
  localId: string;
  uri: string;
  progress: number;
  photoId: string | null;
}

let nextLocalId = 0;

/** Fotos enviadas nesta visita; o contrato de criação da experiência permanece inalterado. */
export function useExperiencePhotos(eventId: string | undefined, description: string) {
  const {
    pickImage, uploadImage, cancelUploads, releaseImage, isPicking, error: pickError,
  } = useImageUpload({ aspect: null, resizeOversized: true });
  const [photos, setPhotos] = useState<ExperiencePhoto[]>([]);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);
  const experience = useRef<{ eventId: string; request: Promise<string> } | null>(null);
  const scope = useRef({ eventId, version: 0, active: false });
  const pendingImages = useRef(new Set<PickedImage>());
  const removing = useRef<string | null>(null);

  // As tabs continuam montadas ao perder o foco: desmontagem sozinha não cancela a visita.
  useFocusEffect(useCallback(() => {
    const changedEvent = scope.current.eventId !== eventId;
    scope.current = { eventId, version: scope.current.version + 1, active: true };
    if (changedEvent) {
      experience.current = null;
      setPhotos([]);
    } else {
      setPhotos((list) => list.filter((photo) => photo.photoId !== null));
    }
    removing.current = null;
    setRemovingPhotoId(null);
    return () => {
      scope.current = { ...scope.current, version: scope.current.version + 1, active: false };
      cancelUploads();
      pendingImages.current.clear();
    };
  }, [eventId, cancelUploads]));

  function isCurrent(visit: typeof scope.current) {
    return scope.current.active && scope.current.version === visit.version;
  }

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

  function ensureExperience(forEventId: string) {
    if (experience.current?.eventId !== forEventId) {
      const request = apiFetch<ExperienceResponse>(endpoints.eventExperiences(forEventId), {
        method: 'POST',
        body: JSON.stringify({ description: description.slice(0, DESCRIPTION_MAX_LENGTH) }),
      }).then((created) => created.experience_id);
      experience.current = { eventId: forEventId, request };
      request.catch(() => {
        if (experience.current?.request === request) experience.current = null;
      });
    }
    return experience.current.request;
  }

  /** Toques repetidos no mesmo retry não criam duas fotos. */
  async function uploadPhoto(picked: PickedImage) {
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
      const experienceId = await ensureExperience(visit.eventId);
      // A criação pode terminar depois de voltar, mudar de evento ou fechar a tela.
      if (!isCurrent(visit)) return;
      const uploaded = await uploadImage<ExperienceImageResponse>(
        endpoints.experienceImages(experienceId), picked,
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

  function resetExperience() {
    experience.current = null;
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
    photos, pickPhoto, pickError: scope.current.active ? pickError : null, isPicking, uploadPhoto, removePhoto,
    dropPhoto, resetExperience, removingPhotoId,
  };
}
