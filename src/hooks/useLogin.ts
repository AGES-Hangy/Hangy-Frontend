import { useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { saveToken } from '@/utils/auth';

interface LoginResult {
  accessToken: string;
  tokenType: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(
    username: string,
    password: string,
  ): Promise<LoginResult | null> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password }).toString(),
      });

      if (!response.ok) {
        setError('E-mail ou senha inválidos');
        return null;
      }

      const data = await response.json();
      await saveToken(data.access_token);
      return { accessToken: data.access_token, tokenType: data.token_type };
    } catch {
      setError('Não foi possível conectar ao servidor');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error };
}
