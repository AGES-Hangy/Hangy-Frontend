import { useEffect } from 'react';

import { useToast } from '@/components/Toast';
import { setSessionExpiredHandler } from '@/utils/http';

/**
 * Liga o interceptor de 401 (e do 403 `Admin access required`) do cliente
 * HTTP ao `Toast`.
 *
 * O `apiFetch` já apaga o token e volta para o Login sozinho, mas o aviso ao
 * usuário depende do contexto do `Toast`, que só existe dentro da árvore de
 * React. Este componente não renderiza nada: só registra a ponte uma vez,
 * dentro do `ToastProvider`.
 */
export function SessionExpiredBridge() {
  const { showInfoToast } = useToast();

  useEffect(() => {
    setSessionExpiredHandler((reason) =>
      showInfoToast(reason === 'changed' ? 'Sua sessão mudou. Entre de novo.' : 'Sua sessão expirou. Entre de novo.'),
    );
    return () => setSessionExpiredHandler(null);
  }, [showInfoToast]);

  return null;
}
