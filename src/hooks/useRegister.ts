import { useState } from 'react';

import { API_BASE_URL, endpoints } from '@/constants/api';
import { saveToken } from '@/utils/auth';
import type { UserType } from '@/types/event';

export type PersonalRegisterPayload = {
  user_type: 'PERSONAL';
  email: string;
  password: string;
  name: string;
  cpf: string;
  phone: string;
  date_of_birth: string;
  state: string;
  city: string;
  /** Data (`Terms.version`) dos termos que o checkbox de aceite mostrava no momento do envio. */
  accepted_terms_version: string;
};

export type BusinessRegisterPayload = {
  user_type: 'BUSINESS';
  email: string;
  password: string;
  business_name: string;
  cnpj: string;
  phone: string;
  address: string;
  location: { latitude: number; longitude: number };
  /** Data (`Terms.version`) dos termos que o checkbox de aceite mostrava no momento do envio. */
  accepted_terms_version: string;
};

export type RegisterPayload = PersonalRegisterPayload | BusinessRegisterPayload;

interface RegisterUser {
  id: string;
  email: string;
  userType: UserType;
  name?: string;
  businessName?: string;
}

export interface RegisterSuccess {
  accessToken: string;
  tokenType: string;
  user: RegisterUser;
}

/** Erro HTTP (4xx) do backend — a tela mapeia `status`+`body` via `registerErrors.ts`. */
export interface RegisterHttpError {
  status: number;
  body: unknown;
}

/**
 * Espelha `useLogin.ts`: fetch cru (rota pré-auth, sem token), a tela só
 * consome. `register` devolve o sucesso já com o token salvo, o par
 * `{status, body}` quando o backend respondeu com erro (pra tela mapear campo
 * a campo), ou `null` quando nem chegou a resposta — aí `error` do hook tem a
 * mensagem genérica de rede.
 */
export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(
    payload: RegisterPayload,
  ): Promise<RegisterSuccess | RegisterHttpError | null> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoints.register()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        return { status: response.status, body };
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
          businessName: data.user.business_name,
        },
      };
    } catch {
      setError('Não foi possível conectar ao servidor.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { register, isLoading, error };
}
