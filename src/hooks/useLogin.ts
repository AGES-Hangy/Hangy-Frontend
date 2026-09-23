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

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  async function login(
    email: string,
    password: string,
  ): Promise<LoginResult | null> {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

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
        const data = await response.json().catch(() => null) as {
          detail?: string | Array<{ loc?: Array<string | number>; msg?: string }>;
        } | null;

        if ([400, 409, 422].includes(response.status) && Array.isArray(data?.detail)) {
          const nextFieldErrors: LoginFieldErrors = {};
          for (const issue of data.detail) {
            const field = issue.loc?.find((part): part is 'email' | 'password' =>
              part === 'email' || part === 'password',
            );
            if (field) nextFieldErrors[field] = issue.msg ?? 'Valor inválido.';
          }
          setFieldErrors(nextFieldErrors);
        } else if (response.status === 401 && data?.detail === 'Incorrect email or password') {
          setError('E-mail ou senha incorretos');
        } else if (response.status === 403 && data?.detail === 'Account has been deleted') {
          setError('Esta conta foi excluída');
        } else if (response.status >= 500) {
          setError('Não foi possível carregar. Tente de novo.');
        } else {
          setError('Não foi possível entrar. Tente novamente.');
        }
        return null;
      }

      const data = await response.json() as {
        access_token: string;
        token_type: string;
        user: { user_type: 'PERSONAL' | 'BUSINESS' };
      };
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
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return { login, isLoading, error, fieldErrors };
}
