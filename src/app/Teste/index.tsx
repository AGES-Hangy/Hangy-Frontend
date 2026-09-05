import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Switch } from '@/components/Switch';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';

/**
 * Tela temporária só pra testar visualmente as variantes do Switch.
 * Pode apagar depois que confirmar que bate com o Figma.
 */
export default function SwitchTestScreen() {
  const [interactiveOff, setInteractiveOff] = useState(false);
  const [interactiveOn, setInteractiveOn] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Switch — todas as variantes</Text>

      <Row label="Off (interativo)">
        <Switch
          checked={interactiveOff}
          onChange={setInteractiveOff}
          accessibilityLabel="Switch off interativo"
        />
      </Row>

      <Row label="On (interativo)">
        <Switch
          checked={interactiveOn}
          onChange={setInteractiveOn}
          accessibilityLabel="Switch on interativo"
        />
      </Row>

      <Row label="Off · disabled">
        <Switch
          checked={false}
          onChange={() => {}}
          disabled
          accessibilityLabel="Switch off desabilitado"
        />
      </Row>

      <Row label="On · disabled">
        <Switch
          checked={true}
          onChange={() => {}}
          disabled
          accessibilityLabel="Switch on desabilitado"
        />
      </Row>
    </ScrollView>
  );
}

/** Linha com label + o componente, só pra organizar a tela de teste. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[24],
    gap: spacing[24],
    backgroundColor: colors.bg.subtle,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[16],
    borderRadius: 14,
    backgroundColor: colors.surface.card,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});