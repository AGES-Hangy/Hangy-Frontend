import { useCallback, useEffect, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { UserType } from '@/types/event';
import type { CurrentUserResponse } from '@/types/profile';
import { describeLoadError, type LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

export interface CurrentUser {
  userId: string;
  userType: UserType;
  email: string;
  /** Nome da pessoa ou nome fantasia. */
  name: string | null;
  /** Dados da conta que só `GET /users/me` devolve (nascimento, estado e cidade; CNPJ e endereço). */
  profile: CurrentUserResponse['profile'];
}

/**
 * Usuário logado (`GET /users/me`). É daqui que sai o tipo da conta — nunca
 * de parâmetro de rota. O 401 é tratado pelo `apiFetch`.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<CurrentUserResponse>(endpoints.me());
      setUser({
        userId: data.id,
        userType: data.user_type,
        email: data.email,
        name: data.name ?? null,
        profile: data.profile ?? null,
      });
    } catch (caught) {
      setError(describeLoadError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return { user, isLoading, error, refetch: fetchUser };
}
