import { ScrollView, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { spacing } from '@/constants/layout';

const event: Event = {
  id: 'preview-event',
  title: 'Festival de Música Hangy',
  date: '2026-08-27T14:30:00',
  location: 'São Paulo, SP',
  imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a',
  privacy: 'Publico',
  distance: '250 m',
};

export default function EventCardPreview() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cards}>
        <EventCard variant="Featured" event={event} onPress={() => {}} />
        <EventCard variant="Compact" event={event} state="Default" onPress={() => {}} />
        <EventCard variant="Compact" event={event} state="Confirmed" onPress={() => {}} />
        <EventCard variant="Compact" event={event} state="Pending" onPress={() => {}} />
        <EventCard variant="MapPreview" event={event} onPress={() => {}} />
        <EventCard variant="Mini" event={event} onPress={() => {}} />
        <EventCard variant="Request" event={event} isNew onPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[16],
  },
  cards: {
    gap: spacing[16],
    alignItems: 'flex-start',
  },
});