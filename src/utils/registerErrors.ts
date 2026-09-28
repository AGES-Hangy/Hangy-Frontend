/**
 * Traduz a resposta de erro de `POST /auth/register` (ver tabela de
 * tratamento de erro da task 056) pro campo e mensagem que a tela precisa
 * mostrar. Fica fora do hook porque `useLogin`/`useRegister` só cuidam de
 * transporte — quem sabe qual campo é "o CPF" ou "o CNPJ" da aba ativa é a
 * tela, e esta função central evita duplicar essa lógica entre as duas abas.
 */

export type RegisterFormField =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'name'
  | 'cpf'
  | 'phone'
  | 'dateOfBirth'
  | 'state'
  | 'city'
  | 'businessName'
  | 'cnpj'
  | 'address'
  | 'instagram';

export type RegisterErrorOutcome =
  /** Erro inline num campo específico — mantém a etapa atual. */
  | { kind: 'field'; field: RegisterFormField; message: string }
  /** Mensagem solta (toast/topo do formulário) — nenhum campo em particular. */
  | { kind: 'general'; message: string }
  /** 403 idade mínima — a tela navega pra `/Register/Blocked`. */
  | { kind: 'ageBlocked' };

const LOC_TO_FIELD: Record<string, RegisterFormField> = {
  email: 'email',
  password: 'password',
  name: 'name',
  cpf: 'cpf',
  phone: 'phone',
  date_of_birth: 'dateOfBirth',
  state: 'state',
  city: 'city',
  business_name: 'businessName',
  cnpj: 'cnpj',
  address: 'address',
  instagram: 'instagram',
};

type PydanticFieldError = { loc: (string | number)[]; msg: string };

function isPydanticDetail(detail: unknown): detail is PydanticFieldError[] {
  return Array.isArray(detail) && detail.every((item) => item && typeof item === 'object' && 'loc' in item);
}

function readDetail(body: unknown): unknown {
  if (body && typeof body === 'object' && 'detail' in body) {
    return (body as { detail: unknown }).detail;
  }
  return null;
}

/**
 * `status`/`detail` -> o(s) resultado(s) que a tela deve aplicar. Sempre
 * devolve pelo menos um item; o 422 do Pydantic pode devolver vários (um por
 * campo citado no array `detail`).
 */
export function mapRegisterError(status: number, body: unknown): RegisterErrorOutcome[] {
  const detail = readDetail(body);

  if (status === 403) {
    return [{ kind: 'ageBlocked' }];
  }

  if (status === 400 && detail === 'CPF is invalid') {
    return [{ kind: 'field', field: 'cpf', message: 'CPF inválido. Confira os números.' }];
  }
  if (status === 400 && detail === 'CNPJ is invalid') {
    return [{ kind: 'field', field: 'cnpj', message: 'CNPJ inválido ou não encontrado na Receita.' }];
  }
  if (status === 400 && detail === 'Invalid coordinates') {
    return [{ kind: 'general', message: 'Não conseguimos usar esse endereço. Escolha outro no mapa.' }];
  }

  if (status === 409 && detail === 'Email is already registered') {
    return [{ kind: 'field', field: 'email', message: 'Este e-mail já está cadastrado.' }];
  }
  if (status === 409 && detail === 'CPF is already registered') {
    return [{ kind: 'field', field: 'cpf', message: 'Este CPF já está cadastrado.' }];
  }
  if (status === 409 && detail === 'CNPJ is already registered') {
    return [{ kind: 'field', field: 'cnpj', message: 'Este CNPJ já está cadastrado.' }];
  }

  if (status === 422 && isPydanticDetail(detail)) {
    const outcomes = detail
      .map((fieldError): RegisterErrorOutcome | null => {
        const locKey = fieldError.loc.find((part): part is string => typeof part === 'string' && part in LOC_TO_FIELD);
        const field = locKey ? LOC_TO_FIELD[locKey] : undefined;
        if (!field) return null;
        return { kind: 'field', field, message: 'Verifique este campo.' };
      })
      .filter((outcome): outcome is RegisterErrorOutcome => outcome !== null);

    if (outcomes.length > 0) return outcomes;
  }

  if (status >= 500) {
    return [{ kind: 'general', message: 'Não foi possível conectar ao servidor. Tente novamente.' }];
  }

  return [{ kind: 'general', message: 'Não foi possível concluir o cadastro. Tente novamente.' }];
}

export type TagsErrorOutcome =
  | { kind: 'toast'; message: string; reloadTags?: boolean }
  | { kind: 'inline'; message: string };

/** Tabela de erro de `PUT /users/me/tags` (etapa 4, só Pessoa Física). */
export function mapSaveTagsError(status: number, body: unknown): TagsErrorOutcome {
  const detail = readDetail(body);

  if (status === 400 && detail === 'Only micro tags can be selected') {
    return { kind: 'toast', message: 'Escolha ao menos uma subcategoria.' };
  }
  if (status === 400 && detail === 'At least one tag is required') {
    return { kind: 'inline', message: 'Escolha pelo menos um interesse.' };
  }
  if (status === 404 && detail === 'Tag not found') {
    return { kind: 'toast', message: 'Essa categoria não existe mais.', reloadTags: true };
  }

  return { kind: 'toast', message: 'Não foi possível salvar. Tente de novo.' };
}
