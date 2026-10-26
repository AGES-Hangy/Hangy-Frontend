import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { CurrentUserResponse, UserRole } from '@/types/profile';
import { describeLoadError, type LoadError } from '@/utils/apiErrors';
import { getToken } from '@/utils/auth';
import { ApiError, apiFetch } from '@/utils/http';

export type SessionRoleState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'ready'; role: UserRole }
  | { status: 'error'; error: LoadError };

/**
 * Sessão salva e papel da conta, para decidir entre a área comum e a Admin.
 *
 * O papel vem sempre do `GET /users/me` e nunca do armazenamento local: assim
 * rebaixar um administrador vale no próximo acesso. O 401 é tratado pelo
 * `apiFetch`, que já volta para o Login — por isso o estado fica em `checking`
 * e a tela não pisca um erro antes do redirecionamento.
 */
export function useSessionRole() {
  const [state, setState] = useState<SessionRoleState>({ status: 'checking' });
  const isMounted = useRef(true);

  const check = useCallback(async () => {
    setState({ status: 'checking' });
    try {
      const token = await getToken();
      if (!isMounted.current) return;
      if (!token) {
        setState({ status: 'anonymous' });
        return;
      }
      const data = await apiFetch<CurrentUserResponse>(endpoints.me());
      if (isMounted.current) setState({ status: 'ready', role: data.role });
    } catch (caught) {
      if (!isMounted.current) return;
      if (caught instanceof ApiError && caught.is(401)) return;
      setState({ status: 'error', error: describeLoadError(caught) });
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void check();
    return () => {
      isMounted.current = false;
    };
  }, [check]);

  return { state, retry: check };
}
