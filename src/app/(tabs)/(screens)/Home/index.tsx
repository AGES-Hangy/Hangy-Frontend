import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';
import { Image } from 'expo-image';

import { colors } from '@/constants/colors';

export default function Home() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
                source={require('../../../../../assets/images/logo.svg')}
                style={styles.logo}
                contentFit="contain"
              />

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
    backgroundColor: colors.action.primary,
  },
  logo: {
    width: 250,
    height: 100,
  },
  button: {
    marginTop: 32,
    height: 48,
    minWidth: 160,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.secondary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
