import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export default function EventDetails() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Event Details</Text>
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
  text: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.logo,
  },
});
