import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>AGES • PUCRS</Text>
          <Text style={styles.title}>Hangy</Text>
          <Text style={styles.subtitle}>
            A base do aplicativo está pronta para começar.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frontend inicializado</Text>
          <Text style={styles.cardBody}>
            React Native com Expo e TypeScript já estão configurados neste
            projeto.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsReady((value) => !value)}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>
              {isReady ? 'Tudo certo!' : 'Testar aplicativo'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  brandBlock: {
    paddingTop: 48,
  },
  eyebrow: {
    color: '#596579',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: '#152238',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    marginTop: 8,
  },
  subtitle: {
    color: '#596579',
    fontSize: 18,
    lineHeight: 26,
    marginTop: 12,
    maxWidth: 320,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 3,
    padding: 24,
    shadowColor: '#152238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  cardTitle: {
    color: '#152238',
    fontSize: 21,
    fontWeight: '700',
  },
  cardBody: {
    color: '#596579',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2F6BFF',
    borderRadius: 14,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

