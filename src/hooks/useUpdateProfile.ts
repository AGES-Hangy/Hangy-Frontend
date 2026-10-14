import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { CurrentUser } from '@/hooks/useCurrentUser';
import type { UserType } from '@/types/event';
import type {
  BusinessProfile,
  BusinessProfilePatch,
  CurrentUserPersonalData,
  PersonalProfile,
  PersonalProfilePatch,
  PersonalProfileResponse,
} from '@/types/profile';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import { mapUpdateProfileError, type UpdateProfileError } from '@/utils/profileErrors';

function profileEndpoint(userType: UserType) {
  return userType === 'BUSINESS' ? endpoints.businessProfile() : endpoints.userProfile();
}

/** `null` quando a rota de leitura responde 404/405 (backend sem a rota). */
async function readProfile<T>(userType: UserType): Promise<T | null> {
  try {
    return await apiFetch<T>(profileEndpoint(userType));
  } catch (caught) {
    if (isApiErrorLike(caught) && (caught.status === 404 || caught.status === 405)) {
      if (__DEV__) console.warn('[perfil] rota de leitura do perfil não existe neste backend');
      return null;
    }
    throw caught;
  }
}

/**
 * Leitura do perfil para preencher a edição. Lança em falha — quem chama
 * traduz com `describeLoadError`.
 *
 * Pessoa física: `GET /users/me/profile` devolve `{ profile, counts }` e só
 * traz nome e bio; e-mail, nascimento, estado e cidade vêm de `GET /users/me`,
 * já carregado em `user`. Estabelecimento: `GET /businesses/me` já é plano.
 *
 * Contra um backend sem a rota de leitura (404/405), a tela abre com o que
 * `user` tiver em vez de ficar inacessível: como o `PATCH` só leva o que
 * mudou, campo vazio não tocado nunca é enviado.
 */
export async function fetchProfileForEdit(
  user: CurrentUser,
): Promise<PersonalProfile | BusinessProfile> {
  if (user.userType === 'BUSINESS') {
    return (await readProfile<BusinessProfile>(user.userType)) ?? {};
  }

  const response = await readProfile<PersonalProfileResponse>(user.userType);
  const account = user.profile as CurrentUserPersonalData | null;

  return {
    name: response?.profile.name ?? user.name,
    description: response?.profile.description,
    email: user.email,
    date_of_birth: account?.date_of_birth,
    state: account?.state,
    city: account?.city,
  };
}

/**
 * `PATCH` do perfil, só com o que mudou: `/users/me/profile` (pessoa física)
 * ou `/businesses/me` (estabelecimento), conforme o `user_type` do usuário
 * logado.
 */
export function useUpdateProfile() {
  const [isLoading, setIsLoading] = useState(false);

  /** `null` no sucesso; no erro, o que a tela deve mostrar. */
  const updateProfile = useCallback(
    async (
      userType: UserType,
      patch: PersonalProfilePatch | BusinessProfilePatch,
    ): Promise<UpdateProfileError | null> => {
      setIsLoading(true);

      try {
        await apiFetch(profileEndpoint(userType), { method: 'PATCH', body: JSON.stringify(patch) });
        return null;
      } catch (caught) {
        return mapUpdateProfileError(caught);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { updateProfile, isLoading };
}
