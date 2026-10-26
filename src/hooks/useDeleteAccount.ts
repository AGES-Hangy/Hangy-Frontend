import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/** `wrongPassword`: o backend recusou a senha; `failed`: qualquer outra falha. */
export type DeleteAccountResult = 'deleted' | 'wrongPassword' | 'failed';

/** `detail` do 401 de sessão inválida — o único 401 que não é "senha errada". */
const INVALID_SESSION_DETAIL = 'Could not validate credentials';

/**
 * Exclusão de conta, confirmada com a senha atual.
 *
 * ⚠️ A rota ainda não existe no backend (falta a task de BE). O contrato abaixo
 * é a proposta deste front — confirmar quando a task existir:
 * `DELETE /users/me` com `{ "password": "..." }`; senha errada responde
 * 400, 401 ou 403.
 */
export function useDeleteAccount() {
  const [isLoading, setIsLoading] = useState(false);

  /** Nunca lança. Nada é apagado localmente aqui: quem chama age no `deleted`. */
  const deleteAccount = useCallback(async (password: string): Promise<DeleteAccountResult> => {
    setIsLoading(true);

    try {
      await apiFetch(
        endpoints.account(),
        { method: 'DELETE', body: JSON.stringify({ password }) },
        // Um 401 aqui pode ser só a senha errada: sem isto o tratamento global
        // derrubaria a sessão de quem errou a digitação.
        { skipUnauthorizedHandler: true },
      );
      return 'deleted';
    } catch (caught) {
      if (!isApiErrorLike(caught)) return 'failed';

      const { status, detail } = caught;
      const isWrongPassword =
        status === 400 || status === 403 || (status === 401 && detail !== INVALID_SESSION_DETAIL);
      return isWrongPassword ? 'wrongPassword' : 'failed';
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteAccount, isLoading };
}
