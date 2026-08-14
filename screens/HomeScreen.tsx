import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.logo}>Hangy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  logo: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.logo,
    letterSpacing: 0.5,
    transform: [{ skewX: '-8deg' }],
    textShadowColor: colors.logoShadow,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
});
