import { useState } from 'react';

import { endpoints } from '@/constants/api';
import type { UserTag } from '@/types/profile';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch, ApiError } from '@/utils/http';
import { mapSaveTagsError, type TagsErrorOutcome } from '@/utils/registerErrors';

type SaveTagsResponse = {
  tags: { id: string; name: string; parent: { id: string; name: string } | null }[];
};

/**
 * Seleção atual de tags do usuário (`GET /users/me/tags`), para a edição de
 * perfil. Lança em falha. A rota (task 067 [BE]) ainda não existe no backend:
 * enquanto responde 404/405, devolve a seleção vazia.
 */
export async function fetchUserTags(): Promise<UserTag[]> {
  try {
    const data = await apiFetch<{ tags?: UserTag[] } | UserTag[]>(endpoints.userTags());
    return Array.isArray(data) ? data : data.tags ?? [];
  } catch (caught) {
    if (isApiErrorLike(caught) && (caught.status === 404 || caught.status === 405)) {
      if (__DEV__) console.warn('[perfil] GET /users/me/tags ainda não existe no backend');
      return [];
    }
    throw caught;
  }
}

/**
 * `PUT /users/me/tags` — etapa 4 do cadastro e Editar perfil, já com o
 * usuário autenticado pelo `POST /auth/register` anterior. Usa `apiFetch`
 * (não o `fetch` cru de `useRegister`/`useTags`) porque é uma rota
 * autenticada: herda o 401 global de graça.
 */
export function useUserTags() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TagsErrorOutcome | null>(null);

  /** `null` no sucesso — devolve o próprio outcome (não só um booleano) porque
   * quem chama precisa dele na hora, sem esperar o próximo render pra ler o
   * `error` do hook. */
  async function saveTags(tagIds: string[]): Promise<TagsErrorOutcome | null> {
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch<SaveTagsResponse>(endpoints.userTags(), {
        method: 'PUT',
        body: JSON.stringify({ tag_ids: tagIds }),
      });
      return null;
    } catch (caught) {
      const outcome: TagsErrorOutcome =
        caught instanceof ApiError && caught.status !== null
          ? mapSaveTagsError(caught.status, { detail: caught.detail })
          : { kind: 'toast', message: 'Não foi possível salvar. Tente de novo.' };
      setError(outcome);
      return outcome;
    } finally {
      setIsLoading(false);
    }
  }

  return { saveTags, isLoading, error };
}
