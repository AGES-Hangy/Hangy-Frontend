import type { PhotoViewerItem } from '@/components/PhotoViewer';
import type { UserPhoto } from '@/types/user';

/** Fotos da Galeria do perfil no formato do `PhotoViewer`. */
export function toPhotoViewerItems(photos: UserPhoto[], { canDelete }: { canDelete: boolean }): PhotoViewerItem[] {
  return photos.map((photo) => ({
    id: photo.photo_id,
    uri: photo.photo_url,
    title: photo.event.title,
    description: photo.description,
    createdAt: photo.created_at,
    canDelete,
  }));
}
