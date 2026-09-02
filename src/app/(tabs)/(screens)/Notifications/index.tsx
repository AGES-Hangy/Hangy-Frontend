import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export default function Notifications() {
  // Sem chamar useTopAppBar, vale o padrão do layout: a barra da Home, com
  // logo e sino — é o que o Figma desenha para esta tela.
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Notifications</Text>
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
