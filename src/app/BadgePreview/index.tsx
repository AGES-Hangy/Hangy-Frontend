import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { colors } from '@/constants/colors';

export default function BadgePreviewScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Badge — rascunho</Text>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Privacidade do evento</Text>
        <View style={styles.row}>
          <Badge family="Privacy" value="PUBLIC" />
          <Badge family="Privacy" value="PRIVATE" />
          <Badge family="Privacy" value="INVITE_ONLY" />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Status de participação</Text>
        <View style={styles.row}>
          <Badge family="Status" value="CONFIRMED" />
          <Badge family="Status" value="PENDING" />
          <Badge family="Status" value="REJECTED" />
          <Badge family="Status" value="FULL" />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Notificação</Text>
        <View style={styles.row}>
          <Badge family="Notification" count={1} />
          <Badge family="Notification" count={3} />
          <Badge family="Notification" count={12} />
          <Badge family="Notification" count={9} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
    backgroundColor: colors.bg.subtle,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  group: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
});
