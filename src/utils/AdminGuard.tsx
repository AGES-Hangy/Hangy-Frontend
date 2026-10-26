import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { SessionLoadError } from '@/components/SessionLoadError';
import { colors } from '@/constants/colors';
import { useSessionRole } from '@/hooks/useSessionRole';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Como o `AuthGuard`, mas também exige `role === 'ADMIN'`: sem sessão vai ao
 * Login e sem o papel vai à Home, antes de renderizar qualquer tela da área.
 *
 * É conveniência, não segurança: quem protege de fato é o 403 do backend em
 * toda rota `/admin/*`.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { state, retry } = useSessionRole();

  useEffect(() => {
    if (state.status === 'anonymous') router.replace('/Login');
    else if (state.status === 'ready' && state.role !== 'ADMIN') router.replace('/Home');
  }, [state]);

  if (state.status === 'ready' && state.role === 'ADMIN') return <>{children}</>;

  return (
    <View style={styles.container}>
      {state.status === 'error' ? (
        <SessionLoadError title={state.error.title} message={state.error.message} onRetry={retry} />
      ) : (
        <ActivityIndicator color={colors.action.secondary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.primary,
  },
});
