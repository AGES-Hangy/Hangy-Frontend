import { useCallback, useEffect, useRef, useState } from 'react';

export function useRefreshable(refetch: () => Promise<boolean | void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsRefreshing(true);

    await refetch();

    if (!isMountedRef.current || requestId !== requestIdRef.current) return;

    setIsRefreshing(false);
  }, [refetch]);

  return { isRefreshing, onRefresh };
}