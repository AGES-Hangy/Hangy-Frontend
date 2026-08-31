import { Stack } from 'expo-router';
import { ToastProvider } from 'src/components/Toast';

export default function RootLayout() {
  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ToastProvider>
  );
}