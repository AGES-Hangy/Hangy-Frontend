import { useState } from 'react';

import { endpoints } from '@/constants/api';
import { apiFetch, ApiError } from '@/utils/http';
import { mapSaveTagsError, type TagsErrorOutcome } from '@/utils/registerErrors';

type SaveTagsResponse = {
  tags: { id: string; name: string; parent: { id: string; name: string } | null }[];
};

/**
 * `PUT /users/me/tags` — etapa 4 do cadastro (só Pessoa Física), já com o
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
