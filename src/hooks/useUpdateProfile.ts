import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import type { UserType } from '@/types/event';
import type {
  BusinessProfile,
  BusinessProfilePatch,
  PersonalProfile,
  PersonalProfilePatch,
} from '@/types/profile';
import { isApiErrorLike } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import { mapUpdateProfileError, type UpdateProfileError } from '@/utils/profileErrors';

function profileEndpoint(userType: UserType) {
  return userType === 'BUSINESS' ? endpoints.businessProfile() : endpoints.userProfile();
}

/**
 * Leitura do perfil para preencher a edição. Lança em falha — quem chama
 * traduz com `describeLoadError`.
 *
 * As rotas de leitura (tasks 071/077 [BE]) ainda não existem no `develop` do
 * backend. Enquanto respondem 404/405, a tela abre com os campos vazios em vez
 * de ficar inacessível: como o `PATCH` só leva o que mudou, campo vazio não
 * tocado nunca é enviado.
 */
export async function fetchProfileForEdit(
  userType: UserType,
): Promise<PersonalProfile | BusinessProfile> {
  try {
    return await apiFetch<PersonalProfile | BusinessProfile>(profileEndpoint(userType));
  } catch (caught) {
    if (isApiErrorLike(caught) && (caught.status === 404 || caught.status === 405)) {
      if (__DEV__) console.warn('[perfil] rota de leitura do perfil ainda não existe no backend');
      return {};
    }
    throw caught;
  }
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
