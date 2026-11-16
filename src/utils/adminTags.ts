import { isApiErrorLike } from '@/utils/apiErrors';

/** Limite de `TAG.tag_name`. */
export const TAG_NAME_MAX_LENGTH = 50;

export const TAG_NAME_CONFLICT_MESSAGE = 'Já existe uma tag/categoria com esse nome';
export const TAG_NAME_INVALID_MESSAGE = `Use de 1 a ${TAG_NAME_MAX_LENGTH} caracteres.`;

/** `detail` dos erros de `/admin/tags` (tabela de tratamento de erro da task 264). */
const PARENT_NOT_FOUND = 'Parent tag not found';
const NAME_ALREADY_EXISTS = 'Tag name already exists at this level';
const TAG_IN_USE = 'Tag is in use';
const CATEGORY_HAS_TAGS = 'Category has tags';
const ADMIN_ACCESS_REQUIRED = 'Admin access required';

export function validateTagName(raw: string): { value: string; isValid: boolean } {
  const value = raw.trim();
  return { value, isValid: value.length > 0 && value.length <= TAG_NAME_MAX_LENGTH };
}

export type TagMutationFailure =
  /** 409 `Tag name already exists at this level` → erro inline no campo, sem perder o texto. */
  | { kind: 'name-conflict' }
  /** 422 (Pydantic) com o campo citado no `loc`. */
  | { kind: 'invalid-field'; field: 'name'; message: string }
  /** 404 `Parent tag not found` (nova tag): a lista local está velha. */
  | { kind: 'parent-not-found' }
  /** 404 em renomear/remover: a tag ou categoria não existe mais. */
  | { kind: 'not-found' }
  /** 409 `Tag is in use`: pede confirmação extra e só então `force=true`. */
  | { kind: 'in-use'; usageCount: number | null }
  /** 409 `Category has tags`: diálogo de bloqueio. */
  | { kind: 'has-tags' }
  /** 401/403 de papel: o `apiFetch` já avisou e voltou para o Login. */
  | { kind: 'session-ended' }
  /** Rede, timeout, 5xx e o resto. `canRetry` só no timeout ("Tentar de novo"). */
  | { kind: 'failed'; message: string; canRetry: boolean };

const GENERIC_FAILURE: TagMutationFailure = {
  kind: 'failed',
  message: 'Não foi possível concluir a ação. Tente de novo.',
  canRetry: false,
};

function bodyOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'body' in error
    ? (error as { body?: unknown }).body
    : null;
}

/** `usage_count` vem no corpo do 409 `Tag is in use`; sem ele a tela usa texto genérico. */
function usageCountOf(body: unknown): number | null {
  const count = (body as { usage_count?: unknown } | null)?.usage_count;
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : null;
}

/** O `detail` do 422 do Pydantic é um array por campo; o `ApiError.detail` textual fica `null`. */
function validationFailureOf(body: unknown): TagMutationFailure | null {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return null;

  const fields = detail.flatMap((item) => {
    const loc = (item as { loc?: unknown } | null)?.loc;
    return Array.isArray(loc) ? loc : [];
  });

  if (fields.includes('name')) {
    return { kind: 'invalid-field', field: 'name', message: TAG_NAME_INVALID_MESSAGE };
  }
  if (fields.includes('parent_id')) return { kind: 'parent-not-found' };
  return null;
}

export function classifyTagMutationError(error: unknown): TagMutationFailure {
  if (!isApiErrorLike(error)) return GENERIC_FAILURE;

  const { kind, status, detail } = error;

  if (kind === 'network') {
    return { kind: 'failed', message: 'Sem conexão com a internet', canRetry: false };
  }
  if (kind === 'timeout') {
    return { kind: 'failed', message: 'A conexão demorou demais', canRetry: true };
  }

  if (status === 401) return { kind: 'session-ended' };
  if (status === 403 && detail === ADMIN_ACCESS_REQUIRED) return { kind: 'session-ended' };

  if (status === 404) {
    return detail === PARENT_NOT_FOUND ? { kind: 'parent-not-found' } : { kind: 'not-found' };
  }

  if (status === 409) {
    if (detail === NAME_ALREADY_EXISTS) return { kind: 'name-conflict' };
    if (detail === TAG_IN_USE) return { kind: 'in-use', usageCount: usageCountOf(bodyOf(error)) };
    if (detail === CATEGORY_HAS_TAGS) return { kind: 'has-tags' };
  }

  if (status === 422) return validationFailureOf(bodyOf(error)) ?? GENERIC_FAILURE;

  return GENERIC_FAILURE;
}