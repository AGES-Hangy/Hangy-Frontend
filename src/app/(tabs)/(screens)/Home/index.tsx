import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';

import { colors } from '@/constants/colors';

export default function Home() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.logo}>Hangy</Text>

      <Link href="/Login" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Entrar</Text>
        </Pressable>
      </Link>
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
  button: {
    marginTop: 32,
    height: 48,
    minWidth: 160,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.logo,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
