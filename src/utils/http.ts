import { router } from 'expo-router';
import { Platform } from 'react-native';

import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  UPLOAD_RESPONSE_TIMEOUT_MS,
  UPLOAD_STALL_TIMEOUT_MS,
  USE_API_MOCKS,
} from '@/constants/api';
import { getToken, removeToken } from '@/utils/auth';
import { resolveMock, resolveUploadMock } from '@/mocks/eventApi';

/** Por que a chamada falhou — separa "o servidor respondeu" de "nem chegou lá". */
export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'cancelled';

/**
 * Falha de uma chamada à API. Carrega o `status` e o `detail` que o backend
 * devolve, que é o par usado pela tabela de tratamento de erro das telas.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly detail: string | null;
  /**
   * Corpo cru da resposta de erro. Existe para o 422 do Pydantic, cujo
   * `detail` é um array por campo e por isso não cabe em `detail`.
   */
  readonly body: unknown;

  constructor(kind: ApiErrorKind, status: number | null, detail: string | null, body: unknown = null) {
    super(detail ?? kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.body = body;
  }

  /** `true` quando o backend respondeu este status. */
  is(status: number, detail?: string) {
    if (this.status !== status) return false;
    return detail === undefined || this.detail === detail;
  }
}

/**
 * Por que a sessão caiu: `expired` é o 401; `changed` é o 403 `Admin access
 * required`, que no uso normal só acontece quando o papel da conta mudou.
 */
export type SessionEndReason = 'expired' | 'changed';

type SessionExpiredHandler = (reason: SessionEndReason) => void;

/** O 403 das rotas `/admin/*` quando a conta não é (mais) administradora. */
const ADMIN_ACCESS_REQUIRED = 'Admin access required';

let onSessionExpired: SessionExpiredHandler | null = null;

/**
 * Registra o que fazer quando a sessão cai. Chamado uma única vez pelo
 * `SessionExpiredBridge` no layout raiz — o `Toast` é contexto de React e não
 * pode ser chamado de um módulo solto, então a ponte é registrada de fora.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler;
}

/**
 * Trata o 401 uma vez só, aqui, e não em cada hook: qualquer tela que chame
 * `apiFetch` herda de graça o "apagar token e voltar para o Login".
 */
async function handleUnauthorized(reason: SessionEndReason = 'expired') {
  await removeToken();
  onSessionExpired?.(reason);
  router.replace('/Login');
}

function detailOf(body: unknown): string | null {
  const detail = (body as { detail?: unknown } | null | undefined)?.detail;
  return typeof detail === 'string' ? detail : null;
}

/** Lê o corpo de erro (e o `detail` textual) sem explodir quando ele não é JSON. */
async function readErrorBody(response: Response): Promise<{ detail: string | null; body: unknown }> {
  try {
    const body = await response.json();
    return { detail: detailOf(body), body };
  } catch {
    return { detail: null, body: null };
  }
}

interface ApiFetchOptions {
  /**
   * Lança o 401 sem passar pelo tratamento global: não apaga a sessão, não
   * mostra o toast de sessão expirada e não volta para o Login. Use só quando
   * o 401 é esperado e a sessão já está sendo encerrada, como no logout.
   */
  skipUnauthorizedHandler?: boolean;
}

/**
 * Cliente HTTP do app. Cuida do token, do timeout, do 401 global e de
 * transformar qualquer falha num `ApiError` — as telas nunca veem `Response`.
 *
 * Com `USE_API_MOCKS` ligado, desvia para `resolveMock` antes de tocar a rede.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  { skipUnauthorizedHandler = false }: ApiFetchOptions = {},
): Promise<T> {
  if (USE_API_MOCKS) {
    return resolveMock<T>(path, init);
  }

  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...init.headers,
      },
    });
  } catch (error) {
    // `abort` é o timeout que agendamos acima; qualquer outra exceção de
    // `fetch` é falta de rede.
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(isTimeout ? 'timeout' : 'network', null, null);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    if (!skipUnauthorizedHandler) await handleUnauthorized();
    const { detail, body } = await readErrorBody(response);
    throw new ApiError('http', 401, detail, body);
  }

  if (!response.ok) {
    const { detail, body } = await readErrorBody(response);
    // Mesmo tratamento do 401: a guarda da área Admin já barra quem não é
    // admin, então este 403 indica que o papel mudou durante a sessão.
    if (response.status === 403 && detail === ADMIN_ACCESS_REQUIRED) await handleUnauthorized('changed');
    throw new ApiError('http', response.status, detail, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Arquivo local a enviar: URI `file://` no nativo, `blob:` na web. */
export interface UploadFile {
  /** Blob preservado para retries na Web, independente da prévia. */
  file?: Blob;
  uri: string;
  mimeType: string;
}

export interface ApiUploadOptions {
  /** Fração enviada, de 0 a 1; `null` quando a plataforma não informa o total. */
  onProgress?: (fraction: number | null) => void;
  signal?: AbortSignal;
}

/**
 * Quem chamou abortou o envio. Não é `ApiError` de propósito: cancelar não é
 * falha e não deve virar mensagem de erro.
 */
export class UploadCancelledError extends Error {
  readonly kind = 'cancelled';
  constructor() {
    super('cancelled');
    this.name = 'UploadCancelledError';
  }
}

async function buildUploadBody(file: UploadFile): Promise<FormData> {
  const name = `upload.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`;
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = file.file ?? await (await fetch(file.uri)).blob();
    form.append('file', blob, name);
  } else {
    // O FormData do React Native lê o arquivo de `{ uri, name, type }`; o tipo
    // do DOM, que é o que o TS enxerga aqui, só conhece `Blob`.
    form.append('file', { uri: file.uri, name, type: file.mimeType } as unknown as Blob);
  }
  return form;
}

function rejectOnAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new UploadCancelledError());
    signal.addEventListener('abort', onAbort);
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/**
 * Faz o envio e devolve o status e o texto da resposta, sem interpretar.
 *
 * Dois relógios: até o primeiro progresso, a cada progresso sem total e depois
 * do último byte, `UPLOAD_RESPONSE_TIMEOUT_MS`; entre progressos com total,
 * `UPLOAD_STALL_TIMEOUT_MS`. Estouro de qualquer um vira `timeout`.
 */
function sendUpload(
  url: string,
  body: FormData,
  token: string | null,
  onProgress: (fraction: number | null) => void,
  signal?: AbortSignal,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastByteSent = false;
    let done = false;

    // Termina uma vez só e solta os handlers de progresso: um evento atrasado
    // depois do cancelamento faria a tela voltar a "Enviando".
    const settle = (outcome: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortBySignal);
      xhr.upload.onprogress = null;
      xhr.upload.onload = null;
      outcome();
    };

    // No RN não está confirmado que `xhr.abort()` dispara `abort` em todos os
    // estados: quem aborta termina a promessa direto, e o `onabort` é redundância.
    const abortWith = (error: Error) => {
      settle(() => reject(error));
      xhr.abort();
    };

    const abortBySignal = () => abortWith(new UploadCancelledError());

    const arm = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => abortWith(new ApiError('timeout', null, null)), ms);
    };

    const markLastByteSent = () => {
      if (lastByteSent) return;
      lastByteSent = true;
      arm(UPLOAD_RESPONSE_TIMEOUT_MS);
    };

    xhr.upload.onprogress = (event) => {
      const computable = event.lengthComputable && event.total > 0;
      onProgress(computable ? event.loaded / event.total : null);
      if (lastByteSent) return;
      if (!computable) arm(UPLOAD_RESPONSE_TIMEOUT_MS);
      else if (event.loaded >= event.total) markLastByteSent();
      else arm(UPLOAD_STALL_TIMEOUT_MS);
    };
    xhr.upload.onload = markLastByteSent;

    xhr.onload = () => {
      settle(() =>
        xhr.status === 0
          ? reject(new ApiError('network', null, null))
          : resolve({ status: xhr.status, text: xhr.responseText }),
      );
    };
    xhr.onerror = () => settle(() => reject(new ApiError('network', null, null)));
    xhr.onabort = () => settle(() => reject(new UploadCancelledError()));

    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    signal?.addEventListener('abort', abortBySignal);
    arm(UPLOAD_RESPONSE_TIMEOUT_MS);
    xhr.send(body);
  });
}

function parseJson(text: string): { body: unknown } | null {
  try {
    return { body: JSON.parse(text) };
  } catch {
    return null;
  }
}

/**
 * Envia um arquivo em `multipart/form-data` (campo `file`) com progresso. Irmã
 * do `apiFetch`: mesmo token, mesmo 401 global e falhas como `ApiError`. Usa
 * XHR porque o `fetch` não informa o progresso do envio. Não define
 * `Content-Type`: o runtime precisa pôr o boundary.
 *
 * Abortar `signal` rejeita com `UploadCancelledError`. Com `USE_API_MOCKS`
 * ligado, desvia para `resolveUploadMock`.
 */
export async function apiUpload<T>(
  path: string,
  file: UploadFile,
  { onProgress, signal }: ApiUploadOptions = {},
): Promise<T> {
  if (signal?.aborted) throw new UploadCancelledError();

  let settled = false;
  const reportProgress = (fraction: number | null) => {
    if (!settled) onProgress?.(fraction);
  };

  try {
    if (USE_API_MOCKS) {
      return await rejectOnAbort(resolveUploadMock<T>(path, file, { onProgress: reportProgress, signal }), signal);
    }

    const token = await getToken().catch(() => { throw new ApiError('network', null, null); });
    const body = await buildUploadBody(file);
    if (signal?.aborted) throw new UploadCancelledError();

    const { status, text } = await sendUpload(`${API_BASE_URL}${path}`, body, token, reportProgress, signal);
    const parsed = parseJson(text);

    if (status === 401) {
      try { await handleUnauthorized(); } catch { /* A limpeza não pode esconder o 401. */ }
      throw new ApiError('http', 401, detailOf(parsed?.body), parsed?.body ?? null);
    }

    if (status < 200 || status >= 300) {
      throw new ApiError('http', status, detailOf(parsed?.body), parsed?.body ?? null);
    }

    if (!parsed) throw new ApiError('http', status, null, null);

    return parsed.body as T;
  } finally {
    settled = true;
  }
}
