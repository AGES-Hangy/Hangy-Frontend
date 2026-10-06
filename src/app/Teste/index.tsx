import { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPin } from '@/components/MapPin';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const PIN_VARIANTS = [
  { label: 'Default', description: 'Evento padrão', state: 'Default' },
  { label: 'Unselected', description: 'Evento não selecionado', state: 'Unselected' },
  { label: 'Selected', description: 'Evento selecionado', state: 'Selected' },
  { label: 'Cluster', description: 'Grupo de eventos', state: 'Cluster' },
  { label: 'UserLocation', description: 'Localização do usuário', state: 'UserLocation' },
] as const;

export default function MapPinTestScreen() {
  const [lastPressed, setLastPressed] = useState<string>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Variações do MapPin</Text>
        <Text style={styles.subtitle}>
          Toque em um pin para testar sua interação.
        </Text>

        {lastPressed && (
          <Text style={styles.lastPressed} accessibilityLiveRegion="polite">
            Último pin pressionado: {lastPressed}
          </Text>
        )}

        <View style={styles.grid}>
          {PIN_VARIANTS.map(({ label, description, state }) => (
            <View key={state} style={styles.card}>
              <Text style={styles.variantName}>{label}</Text>
              <View style={styles.pinArea}>
                {state === 'Cluster' ? (
                  <MapPin
                    state="Cluster"
                    count={8}
                    onPress={() => setLastPressed(label)}
                  />
                ) : state === 'UserLocation' ? (
                  <MapPin
                    state="UserLocation"
                    onPress={() => setLastPressed(label)}
                  />
                ) : (
                  <MapPin
                    state={state}
                    onPress={() => setLastPressed(label)}
                  />
                )}
              </View>
              <Text style={styles.description}>{description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.neutral[50],
  },
  content: {
    padding: spacing[16],
    paddingBottom: spacing[40],
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyM,
    color: colors.text.secondary,
    marginTop: spacing[4],
    marginBottom: spacing[20],
  },
  lastPressed: {
    ...typography.bodyM,
    color: colors.text.brand,
    marginBottom: spacing[16],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
  },
  card: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 176,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.bg.base,
  },
  variantName: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  pinArea: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    ...typography.bodyS,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
