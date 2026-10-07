import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';

/**
 * Exclusão de conta. A rota ainda não existe no backend (falta a task de BE);
 * até lá a chamada falha e a tela mostra o erro, sem apagar nada localmente.
 */
export function useDeleteAccount() {
  const [isLoading, setIsLoading] = useState(false);

  /** `true` quando o backend confirmou a exclusão. Nunca lança. */
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      await apiFetch(endpoints.account(), { method: 'DELETE' });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteAccount, isLoading };
}
