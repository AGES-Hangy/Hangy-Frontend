import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { UserProfile } from '@/types/user';
import { apiFetch } from '@/utils/http';
import { describeProfileLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

export type ProfilePatch = Partial<
  Pick<
    UserProfile,
    | 'connection_status'
    | 'connection_id'
    | 'connection_direction'
    | 'is_following'
    | 'connections_count'
    | 'followers_count'
  >
>;

type LoadedProfile = { id: string; profile: UserProfile } | null;

export function useUserProfile(userId: string | undefined) {
  // O perfil fica guardado com o id a que pertence: uma falha ao recarregar o
  // mesmo id preserva o que já está na tela, e o de outro id nunca é exibido,
  // nem quando a carga do id novo falha.
  const [loaded, setLoaded] = useState<LoadedProfile>(null);
  // Cópia síncrona de `loaded`: o patch precisa do valor atual antes de o
  // React renderizar de novo.
  const loadedRef = useRef<LoadedProfile>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  const latestRequest = useRef(0);

  const storeLoaded = useCallback((next: LoadedProfile) => {
    loadedRef.current = next;
    setLoaded(next);
  }, []);

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
      storeLoaded({ id: userId, profile: result });
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      const loadError = describeProfileLoadError(caught);
      // 404 também é bloqueio: o perfil guardado não pode reaparecer na próxima
      // volta ao foco, antes de a nova resposta chegar.
      if (loadError.kind === 'unavailable') storeLoaded(null);
      setError(loadError);
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedId(userId);
        setIsLoading(false);
      }
    }
  }, [storeLoaded, userId]);

  // Devolve só os valores anteriores dos campos alterados: desfazer com eles
  // não apaga o que um recarregamento tenha trazido nesse meio-tempo.
  const patchProfile = useCallback((changes: ProfilePatch): ProfilePatch | null => {
    const current = loadedRef.current;
    if (!current || current.id !== userId) return null;

    const keys = Object.keys(changes) as (keyof ProfilePatch)[];
    const previous = Object.fromEntries(keys.map((key) => [key, current.profile[key]])) as ProfilePatch;
    storeLoaded({ id: current.id, profile: { ...current.profile, ...changes } });
    return previous;
  }, [storeLoaded, userId]);

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
    patchProfile,
  };
}
