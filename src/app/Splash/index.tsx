import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { colors } from '@/constants/colors';
import { getToken } from '@/utils/auth';

export default function Splash() {
  useEffect(() => {
    let isMounted = true;

    getToken().then((token) => {
      if (!isMounted) return;
      router.replace(token ? '/Home' : '/Login');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando o Hangy"
    >
      <StatusBar style="light" />
      <Image
        source={require('../../../assets/images/logo.svg')}
        style={styles.logo}
        contentFit="contain"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.inverse,
  },
  logo: {
    width: 250,
    height: 100,
  },
});
