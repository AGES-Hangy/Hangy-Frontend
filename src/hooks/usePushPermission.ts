import type { PushPermission } from '@/hooks/usePushPermission.types';

// Versão web, sem importar o expo-notifications: só carregar o pacote já emite
// um aviso de push token no console do navegador. A implementação nativa fica
// em usePushPermission.native.ts.
const request = async () => 'unsupported' as const;

export function usePushPermission(): PushPermission {
  return { status: 'unsupported', canAskAgain: false, request };
}
