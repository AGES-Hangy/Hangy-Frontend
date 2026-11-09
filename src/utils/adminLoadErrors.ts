import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

/** Mesmo `detail` que o `apiFetch` usa para encerrar a sessão no 403; lá a constante não é exportada. */
const ADMIN_ACCESS_REQUIRED = 'Admin access required';

/** Falhas em que o `apiFetch` já encerrou a sessão e está levando para o Login. */
export function endsAdminSession(error: unknown): boolean {
  if (!isApiErrorLike(error)) return false;
  return error.status === 401 || (error.status === 403 && error.detail === ADMIN_ACCESS_REQUIRED);
}

/** O 404 e o 410 da tabela de `describeLoadError` são de evento: nas telas do admin viram o erro genérico. */
export function describeAdminLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  return loadError.kind === 'offline' || loadError.kind === 'timeout' ? loadError : describeLoadError(null);
}
