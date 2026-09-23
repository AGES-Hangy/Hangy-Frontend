import { useState } from 'react';

import { API_BASE_URL, endpoints } from '@/constants/api';
import { saveToken } from '@/utils/auth';
import { UserType } from '@/types/event';

interface LoginUser {
  id: string;
  email: string;
  userType: UserType;
  name: string;
}

interface LoginResult {
  accessToken: string;
  tokenType: string;
  user: LoginUser;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(
    email: string,
    password: string,
  ): Promise<LoginResult | null> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoints.login()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 403) {
        setError('Esta conta foi excluída');
        return null;
      }

      if (!response.ok) {
        setError('E-mail ou senha inválidos');
        return null;
      }

      const data = await response.json();
      await saveToken(data.access_token);
      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        user: {
          id: data.user.id,
          email: data.user.email,
          userType: data.user.user_type,
          name: data.user.name,
        },
      };
    } catch {
      setError('Não foi possível conectar ao servidor');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error };
}
