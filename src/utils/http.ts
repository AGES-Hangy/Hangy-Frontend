import { router } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT_MS, USE_API_MOCKS } from '@/constants/api';
import { getToken, removeToken } from '@/utils/auth';
import { resolveMock } from '@/mocks/eventApi';

/** Tempo local para enviar arquivos em rede móvel, sem mudar o timeout das consultas. */
const API_UPLOAD_TIMEOUT_MS = 120000;

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

type SessionExpiredHandler = () => void;

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
async function handleUnauthorized() {
  await removeToken();
  onSessionExpired?.();
  router.replace('/Login');
}

/** Lê o corpo de erro (e o `detail` textual) sem explodir quando ele não é JSON. */
async function readErrorBody(response: Response): Promise<{ detail: string | null; body: unknown }> {
  try {
    const body = await response.json();
    return { detail: typeof body?.detail === 'string' ? body.detail : null, body };
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
    throw new ApiError('http', response.status, detail, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Andamento de um envio, de 0 a 1. */
export type UploadProgressHandler = (fraction: number) => void;

export interface ApiUploadHandle<T> {
  promise: Promise<T>;
  /** Aborta o envio em voo; a `promise` rejeita com `ApiError` de cancelamento. */
  cancel: () => void;
}

/** Lê o JSON de um `XMLHttpRequest` sem explodir quando o corpo não é JSON. */
function parseXhrBody(xhr: XMLHttpRequest): unknown {
  try {
    return xhr.responseText ? JSON.parse(xhr.responseText) : null;
  } catch {
    return null;
  }
}

/**
 * Envio `multipart/form-data` com progresso. Existe ao lado do `apiFetch`
 * porque `fetch` não informa o andamento do upload — aqui é
 * `XMLHttpRequest` com `xhr.upload.onprogress`.
 *
 * Mesmo contrato do `apiFetch`: token, timeout, 401 global e `ApiError`.
 * O `Content-Type` nunca é definido à mão: quem monta o boundary do
 * multipart é a própria plataforma a partir do `FormData`.
 */
export function apiUpload<T>(
  path: string,
  body: FormData,
  { method = 'POST', onProgress }: { method?: string; onProgress?: UploadProgressHandler } = {},
): ApiUploadHandle<T> {
  if (USE_API_MOCKS) {
    return { promise: resolveMock<T>(path, { method, body }), cancel: () => {} };
  }

  const xhr = new XMLHttpRequest();
  let wasCancelled = false;

  const promise = new Promise<T>((resolve, reject) => {
    void (async () => {
      const token = await getToken();
      if (wasCancelled) {
        reject(new ApiError('cancelled', null, null));
        return;
      }

      xhr.open(method, `${API_BASE_URL}${path}`);
      xhr.timeout = API_UPLOAD_TIMEOUT_MS;
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (progress) => {
        if (progress.lengthComputable && progress.total > 0) {
          onProgress?.(progress.loaded / progress.total);
        }
      };

      xhr.onload = async () => {
        const responseBody = parseXhrBody(xhr);
        const detail =
          typeof (responseBody as { detail?: unknown } | null)?.detail === 'string'
            ? ((responseBody as { detail: string }).detail)
            : null;

        if (xhr.status === 401) {
          try {
            await handleUnauthorized();
          } catch {
            // A falha da limpeza de sessão não pode deixar o upload pendente.
          }
          reject(new ApiError('http', 401, detail, responseBody));
          return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new ApiError('http', xhr.status, detail, responseBody));
          return;
        }

        resolve(responseBody as T);
      };
      xhr.onerror = () => reject(new ApiError('network', null, null));
      xhr.onabort = () => reject(new ApiError('cancelled', null, null));
      xhr.ontimeout = () => reject(new ApiError('timeout', null, null));

      xhr.send(body);
    })().catch(() => reject(new ApiError('network', null, null)));
  });

  return {
    promise,
    cancel: () => {
      wasCancelled = true;
      xhr.abort();
    },
  };
}
