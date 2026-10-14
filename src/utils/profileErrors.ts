import { isApiErrorLike } from '@/utils/apiErrors';
import { isPydanticDetail } from '@/utils/registerErrors';

/** Campos do formulário de Editar perfil que podem receber erro inline. */
export type EditProfileField =
  | 'name'
  | 'bio'
  | 'phone'
  | 'dateOfBirth'
  | 'instagram'
  | 'state'
  | 'city'
  | 'address'
  | 'email'
  | 'password'
  | 'confirmPassword';

export type EditProfileFieldErrors = Partial<Record<EditProfileField, string>>;

/** O que a tela faz com a falha do `PATCH` do perfil. */
export interface UpdateProfileError {
  /** Erros inline, por campo. */
  fieldErrors: EditProfileFieldErrors;
  /** Mensagem no topo do formulário, com "Tentar de novo" (rede e 5xx). */
  banner?: string;
  /** Toast de erro; `retry` acrescenta a ação "Tentar de novo". */
  toast?: { message: string; retry?: boolean };
}

const LOC_TO_FIELD: Record<string, EditProfileField> = {
  name: 'name',
  business_name: 'name',
  description: 'bio',
  phone: 'phone',
  date_of_birth: 'dateOfBirth',
  instagram: 'instagram',
  state: 'state',
  city: 'city',
  address: 'address',
  location: 'address',
  email: 'email',
  password: 'password',
};

const GENERIC_MESSAGE = 'Não foi possível salvar. Tente de novo.';

/** Tabela de tratamento de erro da task 072 para `PATCH /users/me/profile` e `PATCH /businesses/me`. */
export function mapUpdateProfileError(error: unknown): UpdateProfileError {
  if (!isApiErrorLike(error)) return { fieldErrors: {}, banner: GENERIC_MESSAGE };

  const { kind, status, detail } = error;

  if (kind === 'network') return { fieldErrors: {}, banner: 'Sem conexão com a internet' };
  if (kind === 'timeout') {
    return { fieldErrors: {}, toast: { message: 'A conexão demorou demais', retry: true } };
  }

  if (status === 400 && detail === 'Description exceeds maximum length') {
    return { fieldErrors: { bio: 'Bio muito longa' } };
  }
  if (status === 400 && detail === 'Invalid coordinates') {
    return {
      fieldErrors: {},
      toast: { message: 'Não conseguimos usar esse endereço. Escolha outro no mapa.' },
    };
  }
  if (status === 403) {
    // Erro de programação: a variante sai do `user_type` de `GET /users/me`.
    console.warn('[perfil] variante recusada pelo backend:', detail);
    return { fieldErrors: {}, toast: { message: GENERIC_MESSAGE } };
  }
  if (status === 409) {
    // Proposto na task — confirmar o `detail` com o backend.
    return { fieldErrors: { email: 'Esse e-mail já está em uso' } };
  }

  if (status === 422) {
    const body = 'body' in error ? (error as { body: unknown }).body : null;
    const pydantic = body && typeof body === 'object' && 'detail' in body
      ? (body as { detail: unknown }).detail
      : null;

    if (isPydanticDetail(pydantic)) {
      const fieldErrors: EditProfileFieldErrors = {};
      for (const item of pydantic) {
        const key = item.loc.find((part): part is string => typeof part === 'string' && part in LOC_TO_FIELD);
        if (key) fieldErrors[LOC_TO_FIELD[key]] = 'Verifique este campo.';
      }
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
    }
  }

  return { fieldErrors: {}, banner: GENERIC_MESSAGE };
}
