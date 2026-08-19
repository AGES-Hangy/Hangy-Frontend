import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@/constants/colors';
import { getToken } from '@/utils/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getToken().then((token) => {
      if (!isMounted) return;

      if (!token) {
        router.replace('/Login');
        return;
      }

      setIsChecking(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.action.secondary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.primary,
  },
});
