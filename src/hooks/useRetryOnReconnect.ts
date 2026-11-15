import { useEffect, useRef } from 'react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * Estado "Reconectou" da task 141: quando a rede volta, refaz a requisição que
 * falhou, sem o usuário precisar tocar em "Tentar de novo".
 *
 * Só dispara na transição offline → online, e só com `shouldRetry` ligado
 * (há um erro recuperável na tela). Chame antes de qualquer `return` da tela,
 * como todo hook. Devolve o `isOffline` para a tela não chamar
 * `useNetworkStatus` de novo.
 */
export function useRetryOnReconnect(shouldRetry: boolean, retry: () => unknown) {
  const { isOffline } = useNetworkStatus();
  const wasOfflineRef = useRef(isOffline);
  const shouldRetryRef = useRef(shouldRetry);
  const retryRef = useRef(retry);

  shouldRetryRef.current = shouldRetry;
  retryRef.current = retry;

  useEffect(() => {
    const reconnected = wasOfflineRef.current && !isOffline;
    wasOfflineRef.current = isOffline;
    if (reconnected && shouldRetryRef.current) void retryRef.current();
  }, [isOffline]);

  return { isOffline };
}
