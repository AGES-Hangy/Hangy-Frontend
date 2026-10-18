import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { classifyUploadError } from '@/utils/apiErrors';
import { apiUpload } from '@/utils/http';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// 'image/jpg' não é um mimeType padrão, mas algumas câmeras/dispositivos
// reportam JPG assim em vez do correto 'image/jpeg' — aceitamos os dois.
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
}

/** Imagem já enviada: `uri` é a prévia local, `url` é o que vai para a API. */
export interface UploadedImage {
  uri: string;
  url: string;
}

export interface ImageUploadOptions {
  /** Rota de `endpoints` que recebe o arquivo. */
  endpoint: string;
  /** Campo da resposta 201 que traz a URL hospedada. */
  urlField: string;
  /** Recorte pedido no seletor nativo. Sem ele, a imagem vem como foi escolhida. */
  aspect?: [number, number];
  messages: {
    invalidFile: string;
    permissionDenied: string;
    /** Servidor indisponível, resposta inesperada ou erro desconhecido. */
    failed: string;
    /** Sem rede ou tempo esgotado. */
    connection: string;
  };
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

async function pickFileNative(aspect?: [number, number]): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: aspect !== undefined,
    aspect,
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

      settle({ uri: URL.createObjectURL(file), mimeType: file.type, fileSize: file.size });
    });

    window.addEventListener('focus', handleFocus);
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Escolha, validação (tipo, tamanho) e envio de uma imagem para
 * `options.endpoint`, com progresso, cancelamento e erro já em texto para a
 * tela. O recorte (`options.aspect`) só existe no nativo, pedido na tela do
 * seletor do sistema; na web, a imagem vem sem recorte.
 *
 * A URI escolhida é local (`file://` no nativo, `blob:` na web) e serve só de
 * prévia; no corpo da API vai só a URL devolvida pelo envio.
 *
 * Na web, os object URLs são criados e revogados só aqui. A prévia anterior
 * continua válida até um envio novo dar certo, porque a tela pode voltar para
 * ela quando o novo falha ou é cancelado.
 *
 * As telas não desmontam ao sair, então quem chama precisa de `cancelUpload`
 * no blur e de `reset` ao descartar o formulário. `options` deve ser uma
 * constante de módulo.
 */
export function useImageUpload(options: ImageUploadOptions) {
  const { endpoint, urlField, aspect, messages } = options;
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  /** De 0 a 100; `null` quando a plataforma não informa o total. */
  const [progress, setProgress] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const currentUriRef = useRef<string | null>(null);

  /** Só revoga o que este hook criou: URIs do nativo e URLs do servidor passam reto. */
  function releaseUri(uri: string | null) {
    if (uri && objectUrlsRef.current.delete(uri)) URL.revokeObjectURL(uri);
  }

  function releaseAll() {
    objectUrlsRef.current.forEach((uri) => URL.revokeObjectURL(uri));
    objectUrlsRef.current.clear();
    currentUriRef.current = null;
  }

  /** Invalida o envio em andamento; o `catch` dele vê que não é mais o atual. */
  function abortAttempt() {
    attemptRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortAttempt();
      releaseAll();
    };
  }, []);

  async function chooseImage(): Promise<PickedImage | null> {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mountedRef.current) return null;
    if (!permission.granted) {
      setError(messages.permissionDenied);
      return null;
    }

    const picked = Platform.OS === 'web' ? await pickFileWeb() : await pickFileNative(aspect);
    if (!picked) return null;
    if (Platform.OS === 'web') objectUrlsRef.current.add(picked.uri);

    if (!mountedRef.current) {
      releaseUri(picked.uri);
      return null;
    }
    return picked;
  }

  function isAcceptable(picked: PickedImage): boolean {
    const isAcceptedType = ACCEPTED_MIME_TYPES.includes(picked.mimeType);
    // Sem o tamanho confirmado, não dá pra garantir o limite de 5 MB — trata
    // como inválido em vez de deixar passar.
    const isWithinSizeLimit = picked.fileSize !== null && picked.fileSize <= MAX_FILE_SIZE_BYTES;
    if (isAcceptedType && isWithinSizeLimit) return true;

    releaseUri(picked.uri);
    setError(messages.invalidFile);
    return false;
  }

  /** Só escolhe e valida, sem enviar. */
  async function pickImage(): Promise<PickedImage | null> {
    const picked = await chooseImage();
    if (!picked || !isAcceptable(picked)) return null;
    return picked;
  }

  function cancelUpload() {
    abortAttempt();
    setIsUploading(false);
    setProgress(null);
  }

  /**
   * Escolhe, valida e envia. Só devolve algo no 201; em qualquer outro caso
   * devolve `null` e a imagem anterior da tela continua valendo.
   */
  async function pickAndUpload(): Promise<UploadedImage | null> {
    const picked = await chooseImage();
    if (!picked) return null;

    // A escolha nova toma o lugar de um envio em andamento, mesmo que seja
    // recusada logo abaixo.
    cancelUpload();
    if (!isAcceptable(picked)) return null;

    const controller = new AbortController();
    controllerRef.current = controller;
    const attempt = attemptRef.current;
    const isCurrent = () => mountedRef.current && attemptRef.current === attempt;

    setError(null);
    setProgress(0);
    setIsUploading(true);

    try {
      const response = await apiUpload<Record<string, unknown> | null>(endpoint, picked, {
        signal: controller.signal,
        onProgress: (fraction) => {
          if (!isCurrent()) return;
          setProgress(fraction === null ? null : Math.min(100, Math.max(0, Math.floor(fraction * 100))));
        },
      });

      const url = response?.[urlField];
      if (typeof url !== 'string') throw new Error(`Resposta do envio sem "${urlField}"`);

      if (!isCurrent()) {
        releaseUri(picked.uri);
        return null;
      }

      releaseUri(currentUriRef.current);
      currentUriRef.current = picked.uri;
      controllerRef.current = null;
      setIsUploading(false);
      setProgress(null);
      return { uri: picked.uri, url };
    } catch (caught) {
      releaseUri(picked.uri);
      if (!isCurrent()) return null;

      controllerRef.current = null;
      setIsUploading(false);
      setProgress(null);

      const kind = classifyUploadError(caught);
      if (kind === 'invalid-file') setError(messages.invalidFile);
      else if (kind) setError(messages[kind]);
      return null;
    }
  }

  function clearError() {
    setError(null);
  }

  /** A tela tirou a imagem do formulário: libera a prévia local. */
  function clearImage() {
    releaseUri(currentUriRef.current);
    currentUriRef.current = null;
  }

  /** Descarte do formulário: aborta o envio e libera todas as prévias. */
  function reset() {
    cancelUpload();
    releaseAll();
    setError(null);
  }

  return {
    pickImage,
    pickAndUpload,
    cancelUpload,
    clearError,
    clearImage,
    reset,
    isUploading,
    progress,
    error,
  };
}
