import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { apiUpload, type ApiUploadHandle, type UploadProgressHandler } from '@/utils/http';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// 'image/jpg' não é um mimeType padrão, mas algumas câmeras/dispositivos
// reportam JPG assim em vez do correto 'image/jpeg' — aceitamos os dois.
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const INVALID_FILE_MESSAGE = 'Arquivo inválido — use JPG ou PNG\naté 5 MB, na proporção 16:9';
const INVALID_PHOTO_MESSAGE = 'Arquivo inválido — use JPG ou PNG\naté 5 MB';
/** Recorte da capa de evento — o padrão, para quem já usava o hook. */
const COVER_ASPECT: [number, number] = [16, 9];

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
}

export interface ImageUploadOptions {
  /**
   * Recorte pedido no seletor nativo. Padrão `[16, 9]` (capa de evento);
   * `null` deixa a foto sem recorte, como nas fotos do registro de um evento.
   */
  aspect?: [number, number] | null;
}

/**
 * `expo-image-picker` nem sempre devolve `fileSize` no Android — sem isso, o
 * limite de 5 MB não tinha como ser checado de verdade. `File.size` lê o
 * tamanho direto do arquivo no disco como reforço.
 */
function getFileSize(uri: string): number | null {
  try {
    return new File(uri).size;
  } catch {
    return null;
  }
}

async function pickFileNative(aspect: [number, number] | null): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: aspect !== null,
    ...(aspect ? { aspect } : null),
    quality: 1,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset) return null;

  const uri = asset.uri;
  const mimeType =
    asset.mimeType ??
    (uri.toLowerCase().endsWith('.png')
      ? 'image/png'
      : uri.toLowerCase().match(/\.jpe?g$/)
        ? 'image/jpeg'
        : '');

  const fileSize = asset.fileSize ?? getFileSize(uri);
  return { uri, mimeType, fileSize };
}

/**
 * Só na web: o `<input>` interno do expo-image-picker lê o arquivo dentro do
 * próprio listener de `change` e, pra tipos que não são imagem/vídeo (ex.:
 * um .txt ou .pdf que passou pelo filtro do seletor do sistema), joga um
 * `throw` que a própria lib nunca liga a um `reject` — vira um
 * `unhandledrejection` solto que derruba a tela com a tela de erro do Metro
 * antes de qualquer try/catch nosso rodar. Em vez de tentar interceptar esse
 * evento, criamos nosso próprio `<input>` aqui e validamos tipo/tamanho no
 * nosso código, sem nunca chamar o `readFile` problemático da lib.
 */
function pickFileWeb(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png';
    input.style.display = 'none';

    let settled = false;
    function settle(value: PickedImage | null) {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', handleFocus);
      input.remove();
      resolve(value);
    }

    function handleFocus() {
      // O diálogo do sistema fecha e devolve o foco pra janela; se `change`
      // não disparar logo em seguida, o usuário cancelou a seleção.
      setTimeout(() => settle(null), 300);
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        settle(null);
        return;
      }

      const previousUrl = (globalThis as any).__hangyLastObjectUrl as string | undefined;
      if (previousUrl) URL.revokeObjectURL(previousUrl);

      const objectUrl = URL.createObjectURL(file);
      (globalThis as any).__hangyLastObjectUrl = objectUrl;

      settle({ uri: objectUrl, mimeType: file.type, fileSize: file.size });
    });

    window.addEventListener('focus', handleFocus);
    document.body.appendChild(input);
    input.click();
  });
}

/** Nome do arquivo na parte do multipart — a extensão acompanha o tipo. */
function uploadFileName(mimeType: string) {
  return mimeType === 'image/png' ? 'foto.png' : 'foto.jpg';
}

/**
 * Seleção, validação (tipo, tamanho, proporção) e envio de uma imagem.
 * A proporção é garantida pedindo o recorte já na tela do seletor do sistema
 * (`allowsEditing` + `aspect`) no nativo; na web isso não existe, então quem
 * chama recebe a imagem sem recorte lá.
 *
 * ```ts
 * const { pickImage, uploadImage } = useImageUpload({ aspect: null });
 * const picked = await pickImage();
 * const { promise, cancel } = uploadImage(endpoints.experienceImages(id), picked, setProgress);
 * ```
 *
 * A URI de `pickImage` é só prévia local e nunca deve ir num campo de URL
 * (ex.: `cover_photo_url`): o arquivo sobe por `uploadImage`.
 */
export function useImageUpload({ aspect = COVER_ASPECT }: ImageUploadOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  const invalidMessage = aspect ? INVALID_FILE_MESSAGE : INVALID_PHOTO_MESSAGE;
  // Envios em voo, para não deixar um XHR rodando depois que a tela sai.
  const activeUploads = useRef(new Set<() => void>());

  useEffect(() => {
    const uploads = activeUploads.current;
    return () => {
      uploads.forEach((cancel) => cancel());
      uploads.clear();
    };
  }, []);

  async function pickImage(): Promise<PickedImage | null> {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        aspect
          ? 'Permita o acesso às fotos para escolher uma capa'
          : 'Permita o acesso às fotos para escolher uma foto',
      );
      return null;
    }

    const picked = Platform.OS === 'web' ? await pickFileWeb() : await pickFileNative(aspect);
    if (!picked) return null;

    const isAcceptedType = ACCEPTED_MIME_TYPES.includes(picked.mimeType);
    // Sem o tamanho confirmado, não dá pra garantir o limite de 5 MB — trata
    // como inválido em vez de deixar passar.
    const isWithinSizeLimit = picked.fileSize !== null && picked.fileSize <= MAX_FILE_SIZE_BYTES;

    if (!isAcceptedType || !isWithinSizeLimit) {
      setError(invalidMessage);
      return null;
    }

    return picked;
  }

  /**
   * Envia o arquivo em `multipart/form-data`, no campo `file`, para `path`.
   * `onProgress` recebe de 0 a 1; `cancel` aborta o envio.
   */
  function uploadImage<T>(
    path: string,
    image: PickedImage,
    onProgress?: UploadProgressHandler,
  ): ApiUploadHandle<T> {
    let request: ApiUploadHandle<T> | null = null;
    let wasCancelled = false;
    const cancel = () => {
      wasCancelled = true;
      request?.cancel();
    };
    activeUploads.current.add(cancel);

    const promise = (async () => {
      const body = new FormData();
      const name = uploadFileName(image.mimeType);
      if (Platform.OS === 'web') {
        // Na web a URI é um object URL: o Blob precisa ser buscado antes.
        body.append('file', await (await fetch(image.uri)).blob(), name);
      } else {
        // No nativo o React Native monta a parte do arquivo a partir da URI.
        body.append('file', { uri: image.uri, name, type: image.mimeType } as unknown as Blob);
      }

      request = apiUpload<T>(path, body, { onProgress });
      if (wasCancelled) request.cancel();
      return request.promise;
    })().finally(() => activeUploads.current.delete(cancel));

    return { promise, cancel };
  }

  return { pickImage, uploadImage, error };
}
