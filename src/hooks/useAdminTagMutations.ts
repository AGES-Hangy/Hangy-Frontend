import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { CreatedTag, CreateTagPayload, RenameTagPayload } from '@/types/adminTags';
import { classifyTagMutationError } from '@/utils/adminTags';
import type { TagMutationFailure } from '@/utils/adminTags';
import { apiFetch } from '@/utils/http';

export type TagMutationResult<T = void> =
  | { kind: 'done'; data: T }
  | TagMutationFailure
  /** Já havia uma escrita em voo: ignorada para não repetir a ação. */
  | { kind: 'ignored' };

/**
 * Escritas de `/admin/tags`: `POST` (categoria ou tag), `PATCH` (renomear) e `DELETE`.
 * As três resolvem sempre — `kind: 'done'` ou a falha já classificada —, nunca lançam
 * para a tela. Só uma escrita roda por vez.
 */
export function useAdminTagMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async <T,>(request: () => Promise<T>): Promise<TagMutationResult<T>> => {
    if (inFlight.current) return { kind: 'ignored' };
    inFlight.current = true;
    setIsLoading(true);

    try {
      return { kind: 'done', data: await request() };
    } catch (caught) {
      return classifyTagMutationError(caught);
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  const createTag = useCallback(
    (name: string, parentId: string | null) =>
      run<CreatedTag>(() => {
        const body: CreateTagPayload = { name, parent_id: parentId };
        return apiFetch<CreatedTag>(endpoints.adminTags(), {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }),
    [run],
  );

  const renameTag = useCallback(
    (tagId: string, name: string) =>
      run<unknown>(() => {
        const body: RenameTagPayload = { name };
        return apiFetch<unknown>(endpoints.adminTag(tagId), {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      }),
    [run],
  );

  /** Nunca passe `force: true` sem o usuário ter confirmado o 409 `Tag is in use`. */
  const deleteTag = useCallback(
    (tagId: string, options?: { force?: boolean }) =>
      run<void>(() => apiFetch<void>(endpoints.adminTag(tagId, options), { method: 'DELETE' })),
    [run],
  );

  return { createTag, renameTag, deleteTag, isLoading };
}

/**
 * Toast das falhas que as telas não tratam por conta própria. Só o timeout leva a
 * ação "Tentar de novo"; a sessão que caiu já foi avisada pelo `apiFetch`.
 */
export function useTagFailureFeedback() {
  const { addToast } = useToast();

  return useCallback(
    (failure: TagMutationFailure, retry?: () => void) => {
      if (failure.kind === 'session-ended') return;

      if (failure.kind === 'failed') {
        addToast({
          type: 'error',
          message: failure.message,
          ...(failure.canRetry && retry ? { actionLabel: 'Tentar de novo', onAction: retry } : null),
        });
        return;
      }

      addToast({ type: 'error', message: 'Não foi possível concluir a ação. Tente de novo.' });
    },
    [addToast],
  );
}