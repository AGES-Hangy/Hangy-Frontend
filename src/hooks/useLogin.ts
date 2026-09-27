import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL, API_TIMEOUT_MS, endpoints } from '@/constants/api';
import { removeToken, saveToken } from '@/utils/auth';
import type { UserType } from '@/types/event';

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

type AuthUser = { id: string; email: string } & (
  | { user_type: 'PERSONAL'; name: string }
  | { user_type: 'BUSINESS'; business_name: string }
);

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  function clearFieldError(field: 'email' | 'password') {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  }

  async function login(email: string, password: string): Promise<LoginResult | null> {
    if (activeRequest.current) return null;
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let savingSession = false;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoints.login()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null) as {
          detail?: string | Array<{ loc?: Array<string | number>; msg?: string }>;
        } | null;
        if (activeRequest.current !== controller) return null;
        if (controller.signal.aborted) throw new Error('Login timed out');

        if ([400, 409, 422].includes(response.status) && Array.isArray(data?.detail)) {
          const nextFieldErrors: LoginFieldErrors = {};
          for (const issue of data.detail) {
            const field = issue.loc?.find((part): part is 'email' | 'password' =>
              part === 'email' || part === 'password',
            );
            if (field) nextFieldErrors[field] = issue.msg ?? 'Valor inválido.';
          }
          setFieldErrors(nextFieldErrors);
          if (!Object.keys(nextFieldErrors).length) setError('Não foi possível entrar. Tente novamente.');
        } else if (response.status === 401) {
          setError('E-mail ou senha incorretos');
        } else if (response.status === 403 && data?.detail === 'Account has been deleted') {
          await removeToken();
          if (activeRequest.current === controller) setError('Esta conta foi excluída');
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
        user: AuthUser;
      };
      if (activeRequest.current !== controller) return null;
      if (controller.signal.aborted) throw new Error('Login timed out');
      const result: LoginResult = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        user: {
          id: data.user.id,
          email: data.user.email,
          userType: data.user.user_type,
          name: data.user.user_type === 'BUSINESS' ? data.user.business_name : data.user.name,
        },
      };
      clearTimeout(timeoutId);
      savingSession = true;
      await saveToken(result.accessToken);
      return activeRequest.current === controller ? result : null;
    } catch {
      if (activeRequest.current !== controller) return null;
      setError(savingSession
        ? 'Não foi possível salvar sua sessão. Tente novamente.'
        : controller.signal.aborted
          ? 'A conexão demorou demais'
          : 'Não foi possível conectar ao servidor');
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  return { login, isLoading, error, fieldErrors, clearFieldError };
}
