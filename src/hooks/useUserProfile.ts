import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { UserProfile } from '@/types/user';
import { apiFetch } from '@/utils/http';
import { describeProfileLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

export function useUserProfile(userId: string | undefined) {
  // O perfil fica guardado com o id a que pertence: uma falha ao recarregar o
  // mesmo id preserva o que já está na tela, e o de outro id nunca é exibido,
  // nem quando a carga do id novo falha.
  const [loaded, setLoaded] = useState<{ id: string; profile: UserProfile } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;

    if (!userId) {
      setLoadedId(userId);
      setIsLoading(false);
      setError(describeProfileLoadError({ kind: 'http', status: 404, detail: 'User not found' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiFetch<UserProfile>(endpoints.user(userId));
      if (requestId !== latestRequest.current) return;
      setLoaded({ id: userId, profile: result });
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      const loadError = describeProfileLoadError(caught);
      // 404 também é bloqueio: o perfil guardado não pode reaparecer na próxima
      // volta ao foco, antes de a nova resposta chegar.
      if (loadError.kind === 'unavailable') setLoaded(null);
      setError(loadError);
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedId(userId);
        setIsLoading(false);
      }
    }
  }, [userId]);

  // A conexão pode mudar em outra tela (ex.: aceitar a solicitação em
  // Notificações), então o perfil é recarregado sempre que volta ao foco.
  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const isStale = loadedId !== userId;

  return {
    profile: loaded && loaded.id === userId ? loaded.profile : null,
    isLoading: isLoading || isStale,
    error: isStale ? null : error,
    reload: load,
  };
}
