// App.tsx
import React from 'react';
import { SafeAreaView } from 'react-native';
import { ToastProvider } from '@/components/Toast';
import MinhaTela from './useToast';

export default function App() {
  return (
    // Envolva sua aplicação ou rotas com o ToastProvider
    <ToastProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f4f5' }}>
        <MinhaTela />
      </SafeAreaView>
    </ToastProvider>
  );
}