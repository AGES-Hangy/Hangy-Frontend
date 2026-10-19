import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { endpoints } from '@/constants/api';
import type { PersonalProfileResponse } from '@/types/profile';
import { describeLoadError } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

/**
 * Perfil próprio de pessoa física (`GET /users/me/profile`), com os contadores
 * das abas. Recarrega a cada volta ao foco, porque ações em outras telas
 * (editar perfil, confirmar presença) mudam os dados.
 */
export function useMyProfile({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<PersonalProfileResponse | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const latestRequest = useRef(0);
  const hasData = useRef(false);

  // Sem dependências: o `useFocusEffect` roda de novo sempre que o callback
  // muda, então um `load` recriado a cada render entraria em laço.
  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    // Com dados na tela, o erro anterior fica até a resposta: limpar antes
    // faria a tela tratar a recarga em andamento como sucesso.
    if (!hasData.current) setError(null);

    try {
      const result = await apiFetch<PersonalProfileResponse>(endpoints.userProfile());
      if (requestId !== latestRequest.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(describeLoadError(caught));
    }
  }, []);

  // A primeira chamada também sai daqui, e não de um efeito de montagem: o
  // primeiro foco já é a carga inicial.
  useFocusEffect(
    useCallback(() => {
      if (enabled) void load();
    }, [enabled, load]),
  );

  return {
    profile: enabled ? (data?.profile ?? null) : null,
    counts: enabled ? (data?.counts ?? null) : null,
    isLoading: enabled && data === null && error === null,
    error: enabled ? error : null,
    reload: load,
  };
}
