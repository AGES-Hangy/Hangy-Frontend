import { StyleSheet, Text, View } from 'react-native';

import { useTopAppBar } from '@/hooks/useTopAppBar';
import { colors } from '@/constants/colors';

export default function Notifications() {
  // Sem isto o título viria do nome da pasta, em inglês.
  useTopAppBar({ variant: 'Detail', title: 'Notificações' });

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
