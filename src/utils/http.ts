import { router } from 'expo-router';

import { API_BASE_URL, API_TIMEOUT_MS, USE_API_MOCKS } from '@/constants/api';
import { getToken, removeToken } from '@/utils/auth';
import { resolveMock } from '@/mocks/eventApi';

/** Por que a chamada falhou — separa "o servidor respondeu" de "nem chegou lá". */
export type ApiErrorKind = 'http' | 'network' | 'timeout';

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
