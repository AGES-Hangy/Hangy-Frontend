import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png'];
const INVALID_FILE_MESSAGE = 'Arquivo inválido — use JPG ou PNG\naté 5 MB, na proporção 16:9';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [16, 9],
  quality: 1,
};

/**
 * Na web, o `<input>` interno do expo-image-picker lê o arquivo escolhido
 * dentro do próprio listener de `change`; quando o tipo não é imagem/vídeo
 * (ex.: um PDF passou pelo filtro do seletor do sistema), a lib joga um
 * `throw` ali dentro que nunca rejeita a Promise devolvida por
 * `launchImageLibraryAsync` — vira um `unhandledrejection` solto, que
 * derruba a tela com a tela de erro do Metro em vez de cair no try/catch
 * normal de quem chamou. Só na web, escutamos esse evento durante a seleção
 * e religamos ele como rejeição da Promise que devolvemos.
 */
function launchImageLibrary(): Promise<ImagePicker.ImagePickerResult> {
  if (Platform.OS !== 'web') {
    return ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  }

  return new Promise((resolve, reject) => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      event.preventDefault();
      cleanup();
      reject(event.reason);
    }

    function cleanup() {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS).then(
      (result) => {
        cleanup();
        resolve(result);
      },
      (err) => {
        cleanup();
        reject(err);
      },
    );
  });
}

/**
 * Seleção, validação (tipo, tamanho, proporção) e upload da capa de um
 * evento. A proporção 16:9 é garantida pedindo o recorte já na tela do
 * seletor do sistema (`allowsEditing` + `aspect`), então quem chama
 * `pickImage` não precisa validar proporção de novo.
 *
 * O upload em si ainda não tem endpoint no backend — `upload` fica com um
 * TODO até a task 091/backend expor onde hospedar a imagem. Por enquanto ele
 * só simula o progresso para o estado `Uploading` ser exercitável.
 */
export function useImageUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const cancelRequested = useRef(false);

  async function pickImage(): Promise<PickedImage | null> {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permita o acesso às fotos para escolher uma capa');
      return null;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await launchImageLibrary();
    } catch {
      setError(INVALID_FILE_MESSAGE);
      return null;
    }

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? '';
    const fileSize = asset.fileSize ?? null;

    const isAcceptedType = ACCEPTED_MIME_TYPES.includes(mimeType);
    const isWithinSizeLimit = fileSize === null || fileSize <= MAX_FILE_SIZE_BYTES;

    if (!isAcceptedType || !isWithinSizeLimit) {
      setError(INVALID_FILE_MESSAGE);
      return null;
    }

    return { uri: asset.uri, mimeType, fileSize };
  }

  // TODO: substituir a simulação por um fetch real assim que existir um
  // endpoint de upload (ex.: POST /media) que devolva a URL hospedada.
  async function upload(image: PickedImage): Promise<{ url: string } | null> {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    cancelRequested.current = false;

    try {
      for (let step = 1; step <= 10; step += 1) {
        if (cancelRequested.current) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
        setProgress(step * 10);
      }

      return { url: image.uri };
    } catch {
      setError('Não foi possível enviar a capa');
      return null;
    } finally {
      setIsLoading(false);
      setProgress(undefined);
    }
  }

  function cancel() {
    cancelRequested.current = true;
    setIsLoading(false);
    setProgress(undefined);
  }

  return { pickImage, upload, cancel, isLoading, progress, error };
}
