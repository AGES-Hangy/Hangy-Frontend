import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { PickedImage } from '@/hooks/useImageUpload';

/** Reduz dimensão e qualidade, preservando proporção e conferindo os bytes resultantes. */
export async function resizeUploadImage(image: PickedImage, maxBytes: number): Promise<PickedImage | null> {
  const context = ImageManipulator.manipulate(image.uri);
  try {
    const original = await context.renderAsync();
    const width = original.width;
    const height = original.height;
    original.release();
    for (const [edge, quality] of [[2048, 0.8], [1440, 0.65], [1024, 0.5]]) {
      context.reset();
      const factor = Math.min(1, edge / Math.max(width, height));
      context.resize({ width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) });
      const rendered = await context.renderAsync();
      let uri: string;
      try {
        uri = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality })).uri;
      } finally {
        rendered.release();
      }
      const file = Platform.OS === 'web' ? await (await fetch(uri)).blob() : undefined;
      const fileSize = file?.size ?? new File(uri).size;
      if (fileSize > 0 && fileSize <= maxBytes) return { uri, mimeType: 'image/jpeg', fileSize, file };
      if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
      if (Platform.OS !== 'web') new File(uri).delete();
    }
    return null;
  } finally {
    context.release();
  }
}
