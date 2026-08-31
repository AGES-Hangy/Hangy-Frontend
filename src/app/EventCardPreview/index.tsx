import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EventCard } from '@/components/EventCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

const baseEvent = {
  id: 'event-card-preview-1',
  title: 'Sunset Rooftop Session',
  date: '2026-09-03T20:30:00-03:00',
  location: 'Centro, São Paulo',
  imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  privacy: 'Publico' as const,
};

const eventVariants = {
  featured: { ...baseEvent, title: 'Sunset Rooftop Session', privacy: 'Publico' as const },
  compactDefault: { ...baseEvent, title: 'Coffee & Networking', privacy: 'Privado' as const },
  compactConfirmed: { ...baseEvent, title: 'Live DJ Night', privacy: 'PorConvite' as const },
  compactPending: { ...baseEvent, title: 'Morning Run Club', privacy: 'Publico' as const },
  mapPreview: { ...baseEvent, title: 'Street Food Market', privacy: 'Publico' as const, distance: '320 metros' },
  mini: { ...baseEvent, title: 'Yoga no Parque', privacy: 'Publico' as const },
  requestNew: { ...baseEvent, title: 'Exclusive Meet-up', privacy: 'PorConvite' as const, requesterName: 'Aline' },
  requestRead: { ...baseEvent, title: 'Creative Workshop', privacy: 'Privado' as const, requesterName: 'Bruno' },
};

export default function EventCardPreviewScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>EventCard — rascunho</Text>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <EventCard variant="Featured" event={eventVariants.featured} onPress={() => undefined} />
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Compact</Text>
        <View style={styles.stack}>
          <EventCard variant="Compact" event={eventVariants.compactDefault} state="Default" onPress={() => undefined} />
          <EventCard variant="Compact" event={eventVariants.compactConfirmed} state="Confirmed" onPress={() => undefined} />
          <EventCard variant="Compact" event={eventVariants.compactPending} state="Pending" onPress={() => undefined} />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>MapPreview</Text>
        <EventCard variant="MapPreview" event={eventVariants.mapPreview} onPress={() => undefined} />
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Mini</Text>
        <EventCard variant="Mini" event={eventVariants.mini} onPress={() => undefined} />
      </View>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Request</Text>
        <View style={styles.row}>
          <EventCard variant="Request" event={eventVariants.requestNew} isNew onPress={() => undefined} />
          <EventCard variant="Request" event={eventVariants.requestRead} isNew={false} onPress={() => undefined} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[24],
    gap: spacing[20],
    backgroundColor: colors.bg.subtle,
    paddingBottom: spacing[40],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  group: {
    gap: spacing[12],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stack: {
    gap: spacing[12],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[12],
    alignItems: 'center',
  },
});
