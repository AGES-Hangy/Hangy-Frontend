import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png'];
const INVALID_FILE_MESSAGE = 'Arquivo inválido — use JPG ou PNG\naté 5 MB, na proporção 16:9';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
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

async function pickFileNative(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 1,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  const fileSize = asset.fileSize ?? getFileSize(asset.uri);
  return { uri: asset.uri, mimeType: asset.mimeType ?? '', fileSize };
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
    input.accept = 'image/jpeg,image/png';
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
      settle(file ? { uri: URL.createObjectURL(file), mimeType: file.type, fileSize: file.size } : null);
    });

    window.addEventListener('focus', handleFocus);
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Seleção, validação (tipo, tamanho, proporção) e upload da capa de um
 * evento. A proporção 16:9 é garantida pedindo o recorte já na tela do
 * seletor do sistema (`allowsEditing` + `aspect`) no nativo; na web isso não
 * existe, então quem chama recebe a imagem sem recorte lá.
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

    const picked = Platform.OS === 'web' ? await pickFileWeb() : await pickFileNative();
    if (!picked) return null;

    const isAcceptedType = ACCEPTED_MIME_TYPES.includes(picked.mimeType);
    // Sem o tamanho confirmado, não dá pra garantir o limite de 5 MB — trata
    // como inválido em vez de deixar passar.
    const isWithinSizeLimit = picked.fileSize !== null && picked.fileSize <= MAX_FILE_SIZE_BYTES;

    if (!isAcceptedType || !isWithinSizeLimit) {
      setError(INVALID_FILE_MESSAGE);
      return null;
    }

    return picked;
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
