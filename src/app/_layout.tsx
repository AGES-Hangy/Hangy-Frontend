import { Stack } from 'expo-router';

import { ToastProvider } from '@/components/Toast';
import { SessionExpiredBridge } from '@/utils/SessionExpiredBridge';

export default function RootLayout() {
  return (
    <ToastProvider>
      {/* Não renderiza nada: só conecta o 401 do cliente HTTP ao Toast. */}
      <SessionExpiredBridge />
      <Stack screenOptions={{ headerShown: false }} />
    </ToastProvider>
  );
}
