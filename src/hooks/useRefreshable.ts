import { useCallback, useEffect, useRef, useState } from 'react';

export function useRefreshable(refresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    if (isMountedRef.current) setIsRefreshing(false);
  }, [refresh]);

  return { isRefreshing, onRefresh };
}