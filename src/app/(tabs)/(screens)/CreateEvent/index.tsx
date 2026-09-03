import { StyleSheet, Text, View } from 'react-native';

import { useTopAppBar } from '@/hooks/useTopAppBar';
import { colors } from '@/constants/colors';

export default function CreateEvent() {
  // Criar evento é um fluxo que fecha, não que volta um passo — por isso Modal
  // (o `x` no lugar da seta), como o frame do Figma desenha.
  useTopAppBar({ variant: 'Modal', title: 'Criar evento' });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Event</Text>
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
  text: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.action.secondary,
  },
});
