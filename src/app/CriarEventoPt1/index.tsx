import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export default function CriarEventoPt1() {
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