import { useEffect, useRef } from 'react';

import { useToast } from '@/components/Toast';

type NotificationLoadErrorKind = 'offline' | 'timeout' | 'server' | 'invalid' | null;

type NotificationLoadFeedbackOptions = {
  error: string | null;
  errorKind: NotificationLoadErrorKind;
  errorScope: 'notifications' | 'pagination' | null;
  retry: () => void | Promise<void>;
};

/** Mantém os erros transitórios de carregamento coerentes entre as telas. */
export function useNotificationLoadFeedback({
  error,
  errorKind,
  errorScope,
  retry,
}: NotificationLoadFeedbackOptions) {
  const { addToast } = useToast();
  const retryRef = useRef(retry);
  const lastFeedbackRef = useRef<string | null>(null);

  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  useEffect(() => {
    if (!error || !errorKind || !errorScope) {
      lastFeedbackRef.current = null;
      return;
    }

    const feedbackKey = `${errorScope}:${errorKind}:${error}`;
    if (lastFeedbackRef.current === feedbackKey) return;
    lastFeedbackRef.current = feedbackKey;

    if (errorKind === 'timeout') {
      addToast({
        type: 'error',
        message: 'A conexão demorou demais',
        actionLabel: 'Tentar de novo',
        onAction: () => void retryRef.current(),
      });
    } else if (errorKind === 'invalid') {
      addToast({ type: 'error', message: 'Não foi possível carregar. Tente de novo.' });
    }
  }, [addToast, error, errorKind, errorScope]);
}
