import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { classifyUploadError } from '@/utils/apiErrors';
import { announce } from '@/utils/accessibility';
import { apiUpload } from '@/utils/http';
import { resizeUploadImage } from '@/utils/resizeUploadImage';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// 'image/jpg' não é um mimeType padrão, mas algumas câmeras/dispositivos
// reportam JPG assim em vez do correto 'image/jpeg' — aceitamos os dois.
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Prazos para um toque novo substituir um seletor que ainda não deu resultado.
// Com o diálogo aberto de fato nenhum toque chega à página, então eles só
// contam depois que ele fecha: o primeiro, a partir do foco de volta na janela;
// o segundo, para quando nem o foco volta (e no nativo), a partir da abertura.
const PICKER_FOCUS_FALLBACK_MS = 300;
const PICKER_NO_SIGNAL_FALLBACK_MS = 1000;

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileSize: number | null;
  file?: Blob;
}

/** Imagem já enviada: `uri` é a prévia local, `url` é o que vai para a API. */
export interface UploadedImage {
  uri: string;
  url: string;
}

export interface ImageUploadOptions {
  /** Rota de `endpoints` que recebe o arquivo. */
  endpoint?: string;
  /** Campo da resposta 201 que traz a URL hospedada. */
  urlField?: string;
  /** Recorte pedido no seletor nativo. Sem ele, a imagem vem como foi escolhida. */
  aspect?: [number, number];
  resizeOversized?: boolean;
  messages: {
    invalidFile: string;
    permissionDenied: string;
    /** Servidor indisponível, resposta inesperada ou erro desconhecido. */
    failed: string;
    /** Sem rede ou tempo esgotado. */
    connection: string;
    /** Lidos pelo leitor de tela no começo e no fim do envio, nunca a porcentagem. */
    uploading: string;
    uploaded: string;
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

interface WebFilePicker {
  result: Promise<PickedImage | null>;
  /** Encerra o seletor: `result` resolve `null` e o que chegar depois é ignorado. */
  abort: () => void;
  focusReturnedAt: () => number | null;
}

interface PendingPick {
  startedAt: number;
  /** Só na web, e só depois da permissão. */
  web: WebFilePicker | null;
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
 *
 * O resultado vem só do `change` ou do `cancel`. O foco volta para a janela
 * antes do `change`, ainda sem o arquivo em `input.files`, então ele não pode
 * significar cancelamento: um prazo curto depois dele transformava escolhas em
 * cancelamentos. Ele só informa que o diálogo fechou, para o hook liberar um
 * toque novo nos navegadores que não disparam `cancel` no input.
 */
function openFilePickerWeb(): WebFilePicker {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/jpg,image/png';
  input.style.display = 'none';

  let focusReturnedAt: number | null = null;
  let settled = false;
  let resolveResult!: (value: PickedImage | null) => void;
  const result = new Promise<PickedImage | null>((resolve) => {
    resolveResult = resolve;
  });

  function settle(value: PickedImage | null) {
    if (settled) return;
    settled = true;
    window.removeEventListener('focus', handleFocus);
    input.remove();
    resolveResult(value);
  }

  function handleFocus() {
    focusReturnedAt = Date.now();
  }

  input.addEventListener('change', () => {
    // Depois de `abort`, um object URL criado aqui não teria quem o revogasse.
    if (settled) return;
    const file = input.files?.[0];
    if (!file) {
      settle(null);
      return;
    }

    settle({ uri: URL.createObjectURL(file), mimeType: file.type, fileSize: file.size, file });
  });
  input.addEventListener('cancel', () => settle(null));

  window.addEventListener('focus', handleFocus);
  document.body.appendChild(input);
  input.click();

  return { result, abort: () => settle(null), focusReturnedAt: () => focusReturnedAt };
}

function pickSeemsClosed(pick: PendingPick): boolean {
  const focusReturnedAt = pick.web?.focusReturnedAt() ?? null;
  if (focusReturnedAt !== null) return Date.now() - focusReturnedAt >= PICKER_FOCUS_FALLBACK_MS;
  return Date.now() - pick.startedAt >= PICKER_NO_SIGNAL_FALLBACK_MS;
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
 * no blur e de `reset` ao descartar o formulário. As funções devolvidas são
 * estáveis entre renders, para poderem entrar em dependências de efeitos; por
 * isso `options` é lida no momento da chamada, não capturada.
 */
export function useImageUpload(options: ImageUploadOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  /** De 0 a 100; `null` quando a plataforma não informa o total. */
  const [progress, setProgress] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const currentUriRef = useRef<string | null>(null);
  const pickRef = useRef<PendingPick | null>(null);
  const uploadsRef = useRef(new Set<AbortController>());
  const preparationRef = useRef<object | null>(null);

  /** Só revoga o que este hook criou: URIs do nativo e URLs do servidor passam reto. */
  const releaseUri = useCallback((uri: string | null) => {
    if (uri && objectUrlsRef.current.delete(uri)) URL.revokeObjectURL(uri);
  }, []);

  const releaseAll = useCallback(() => {
    objectUrlsRef.current.forEach((uri) => URL.revokeObjectURL(uri));
    objectUrlsRef.current.clear();
    currentUriRef.current = null;
  }, []);

  /** Invalida o envio em andamento; o `catch` dele vê que não é mais o atual. */
  const abortAttempt = useCallback(() => {
    attemptRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  /** Desiste do seletor pendente; o que ele devolver depois é descartado. */
  const abortPick = useCallback(() => {
    pickRef.current?.web?.abort();
    pickRef.current = null;
    preparationRef.current = null;
    if (mountedRef.current) setIsPicking(false);
  }, []);

  /** O FileUpload não é região viva: todo erro mostrado também é anunciado. */
  const showError = useCallback((message: string) => {
    setError(message);
    announce(message, 'assertive');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortPick();
      abortAttempt();
      releaseAll();
      uploadsRef.current.forEach(controller => controller.abort());
      uploadsRef.current.clear();
    };
  }, [abortPick, abortAttempt, releaseAll]);

  /**
   * Um seletor por vez: a chamada que chega enquanto ele parece aberto (toque
   * duplo, ou o `change` ainda a caminho) é ignorada. Depois dos prazos, a
   * chamada nova substitui o pendente, senão um navegador que não dispara
   * `cancel` deixaria a área sem resposta.
   */
  const chooseImage = useCallback(async (): Promise<PickedImage | null> => {
    const pending = pickRef.current;
    if (pending && !pickSeemsClosed(pending)) return null;
    abortPick();

    const pick: PendingPick = { startedAt: Date.now(), web: null };
    pickRef.current = pick;
    setIsPicking(true);
    const isCurrentPick = () => mountedRef.current && pickRef.current === pick;

    try {
      const { aspect, messages } = optionsRef.current;
      setError(null);

      const permission = Platform.OS === 'web' ? { granted: true } : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!isCurrentPick()) return null;
      if (!permission.granted) {
        showError(messages.permissionDenied);
        return null;
      }

      let picked: PickedImage | null;
      if (Platform.OS === 'web') {
        pick.web = openFilePickerWeb();
        picked = await pick.web.result;
        if (picked) objectUrlsRef.current.add(picked.uri);
      } else {
        picked = await pickFileNative(aspect);
      }
      if (!picked) return null;

      if (!isCurrentPick()) {
        releaseUri(picked.uri);
        return null;
      }
      return picked;
    } catch {
      if (isCurrentPick()) showError(optionsRef.current.messages.failed);
      return null;
    } finally {
      if (pickRef.current === pick) {
        pickRef.current = null;
        if (mountedRef.current) setIsPicking(false);
      }
    }
  }, [abortPick, releaseUri, showError]);

  const isAcceptable = useCallback((picked: PickedImage): boolean => {
    const isAcceptedType = ACCEPTED_MIME_TYPES.includes(picked.mimeType);
    // Sem o tamanho confirmado, não dá pra garantir o limite de 5 MB — trata
    // como inválido em vez de deixar passar.
    const isWithinSizeLimit = picked.fileSize !== null && picked.fileSize > 0 && picked.fileSize <= MAX_FILE_SIZE_BYTES;
    if (isAcceptedType && isWithinSizeLimit) return true;

    releaseUri(picked.uri);
    showError(optionsRef.current.messages.invalidFile);
    return false;
  }, [releaseUri, showError]);

  /** Só escolhe e valida, sem enviar. */
  const pickImage = useCallback(async (): Promise<PickedImage | null> => {
    if (preparationRef.current) return null;
    let picked = await chooseImage();
    if (!picked) return null;
    const preparation = {};
    preparationRef.current = preparation;
    const isCurrent = () => mountedRef.current && preparationRef.current === preparation;
    setIsPicking(true);
    try {
      if (optionsRef.current.resizeOversized && ACCEPTED_MIME_TYPES.includes(picked.mimeType) &&
          picked.fileSize !== null && picked.fileSize > MAX_FILE_SIZE_BYTES) {
        const original = picked;
        try {
          picked = await resizeUploadImage(original, MAX_FILE_SIZE_BYTES);
          if (picked && Platform.OS === 'web' && picked.uri.startsWith('blob:')) objectUrlsRef.current.add(picked.uri);
        } finally { releaseUri(original.uri); }
      }
      if (!isCurrent()) { if (picked) releaseUri(picked.uri); return null; }
      if (!picked) { showError(optionsRef.current.messages.invalidFile); return null; }
      if (!isAcceptable(picked)) return null;
      return picked;
    } catch {
      if (isCurrent()) showError(optionsRef.current.messages.failed);
      return null;
    } finally {
      if (preparationRef.current === preparation) {
        preparationRef.current = null;
        if (mountedRef.current) setIsPicking(false);
      }
    }
  }, [chooseImage, isAcceptable, releaseUri, showError]);

  /** Também desiste de um seletor pendente, que sem `cancel` pode nunca resolver. */
  const cancelUpload = useCallback(() => {
    abortPick();
    abortAttempt();
    setIsUploading(false);
    setProgress(null);
  }, [abortPick, abortAttempt]);

  /**
   * Escolhe, valida e envia. Só devolve algo no 201; em qualquer outro caso
   * devolve `null` e a imagem anterior da tela continua valendo.
   */
  const pickAndUpload = useCallback(async (): Promise<UploadedImage | null> => {
    if (!optionsRef.current.endpoint || !optionsRef.current.urlField) return null;
    const picked = await chooseImage();
    if (!picked) return null;

    // A escolha nova toma o lugar de um envio em andamento, mesmo que seja
    // recusada logo abaixo.
    cancelUpload();
    if (!isAcceptable(picked)) return null;

    const { endpoint, urlField, messages } = optionsRef.current;
    if (!endpoint || !urlField) { releaseUri(picked.uri); return null; }
    const controller = new AbortController();
    controllerRef.current = controller;
    const attempt = attemptRef.current;
    const isCurrent = () => mountedRef.current && attemptRef.current === attempt;

    setError(null);
    setProgress(0);
    setIsUploading(true);
    announce(messages.uploading);

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
      announce(messages.uploaded);
      return { uri: picked.uri, url };
    } catch (caught) {
      releaseUri(picked.uri);
      if (!isCurrent()) return null;

      controllerRef.current = null;
      setIsUploading(false);
      setProgress(null);

      const kind = classifyUploadError(caught);
      if (kind === 'invalid-file') showError(messages.invalidFile);
      else if (kind) showError(messages[kind]);
      return null;
    }
  }, [chooseImage, cancelUpload, isAcceptable, releaseUri, showError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** A tela tirou a imagem do formulário: libera a prévia local. */
  const clearImage = useCallback(() => {
    releaseUri(currentUriRef.current);
    currentUriRef.current = null;
  }, [releaseUri]);

  /** Descarte do formulário: aborta o envio e libera todas as prévias. */
  const reset = useCallback(() => {
    cancelUpload();
    releaseAll();
    setError(null);
  }, [cancelUpload, releaseAll]);

  // Fotos da experiência podem enviar mais de um arquivo; capas mantêm pickAndUpload.
  const cancelUploads = useCallback(() => {
    abortPick();
    uploadsRef.current.forEach(controller => controller.abort());
    uploadsRef.current.clear();
  }, [abortPick]);

  const uploadImage = useCallback(<T,>(path: string, image: PickedImage, onProgress?: (value: number) => void) => {
    const controller = new AbortController();
    uploadsRef.current.add(controller);
    const promise = apiUpload<T>(path, image, {
      signal: controller.signal,
      onProgress: value => { if (value !== null) onProgress?.(value); },
    }).finally(() => uploadsRef.current.delete(controller));
    return { promise, cancel: () => controller.abort() };
  }, []);

  return {
    uploadImage, cancelUploads, releaseImage: releaseUri, isPicking,
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
