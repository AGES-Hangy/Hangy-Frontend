import { useCallback, useEffect, useState } from 'react';

import { API_BASE_URL } from '@/constants/api';

export type TagLeaf = { id: string; name: string; type: 'MICRO' };
export type TagNode = { id: string; name: string; type: 'MACRO'; children: TagLeaf[] };

/**
 * Árvore de tags para a criação de evento. Segue o padrão de `useLogin`: o
 * hook faz o fetch, a tela só consome. Endpoint público (`GET /tags/tree`),
 * sem token.
 *
 * Em falha, `error` recebe uma mensagem em português e `tags` fica vazio —
 * nunca lança para a tela.
 */
export function useTags() {
  const [tags, setTags] = useState<TagNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/tags/tree`);

      if (!response.ok) {
        setError('Não foi possível carregar as tags.');
        setTags([]);
        return;
      }

      const data = (await response.json()) as TagNode[];
      setTags(data);
    } catch {
      setError('Não foi possível carregar as tags.');
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  return { tags, isLoading, error, refetch: fetchTags };
}
