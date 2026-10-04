import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { UserEventItem, UserEventsPage } from '@/types/user';
import { apiFetch } from '@/utils/http';
import { describeProfileLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';

export function useUserEvents(userId: string | undefined) {
  const [loaded, setLoaded] = useState<{ id: string; events: UserEventItem[] } | null>(null);
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
      // Só a primeira página; `next_cursor` é ignorado.
      const result = await apiFetch<UserEventsPage>(endpoints.userEvents(userId));
      if (requestId !== latestRequest.current) return;
      setLoaded({ id: userId, events: result.items });
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeProfileLoadError(caught));
    } finally {
      if (requestId === latestRequest.current) {
        setLoadedId(userId);
        setIsLoading(false);
      }
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const isStale = loadedId !== userId;

  return {
    events: loaded && loaded.id === userId ? loaded.events : null,
    isLoading: isLoading || isStale,
    error: isStale ? null : error,
    reload: load,
  };
}
