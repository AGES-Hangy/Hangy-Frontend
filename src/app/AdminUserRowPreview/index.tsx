import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminUserRow } from '@/components/AdminUserRow';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

const noop = () => {};

export default function AdminUserRowPreview() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
      <AdminUserRow
        name="Marina Schmitt"
        eventCount={12}
        reportCount={0}
        moderationStatus="ACTIVE"
        onPress={noop}
      />

      <AdminUserRow
        name="Rafael Antunes"
        untilDate="12/10"
        reportCount={2}
        moderationStatus="SUSPENDED"
        onPress={noop}
      />

      <AdminUserRow
        name="Lucas Ferreira"
        untilDate="02/09"
        reportCount={5}
        moderationStatus="BANNED"
        onPress={noop}
      />

      <AdminUserRow
        name="Beatriz Oliveira"
        eventCount={1}
        avatarUri="https://i.pravatar.cc/80?img=47"
        moderationStatus="ACTIVE"
        onPress={noop}
      />

      <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.subtle,
  },
  container: {
    padding: spacing[16],
    gap: spacing[8],
    backgroundColor: colors.bg.subtle,
    flexGrow: 1,
  },
  spacer: {
    height: spacing[32],
  },
});
