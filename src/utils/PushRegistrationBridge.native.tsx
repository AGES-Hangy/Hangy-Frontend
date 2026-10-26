import { useEffect, useRef } from 'react';

import { useRegisterDevice } from '@/hooks/useRegisterDevice';
import { usePushPermission } from '@/hooks/usePushPermission';
import { fetchExpoPushToken } from '@/utils/expoPushToken';
import { isPushOptedOut } from '@/utils/pushToken';

/**
 * Pede a permissão com o diálogo nativo do sistema e, concedida, registra o
 * aparelho no backend. Roda a cada abertura do app: o POST é um upsert por
 * token, então também reatribui o aparelho se outra conta entrar nele.
 */
export function PushRegistrationBridge() {
  const { status, request } = usePushPermission();
  const { registerDevice } = useRegisterDevice();
  const hasAsked = useRef(false);

  useEffect(() => {
    // Só o estado nunca decidido: negado não pergunta de novo (no iOS o sistema nem deixa).
    if (status !== 'undetermined' || hasAsked.current) return;
    hasAsked.current = true;
    request().catch(() => {});
  }, [status, request]);

  useEffect(() => {
    if (status !== 'granted') return;

    let isCurrent = true;
    void (async () => {
      // Quem desligou as notificações em Editar perfil não é registrado de novo.
      if (await isPushOptedOut()) return;
      const token = await fetchExpoPushToken();
      if (token && isCurrent) void registerDevice(token);
    })();

    return () => {
      isCurrent = false;
    };
  }, [status, registerDevice]);

  return null;
}
