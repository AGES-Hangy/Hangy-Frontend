import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { EventCard } from '@/components/EventCard';
import type { Event, EventPrivacy } from '@/components/EventCard/types';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useEventShare } from '@/hooks/useEventShare';

export default function EventoPublicado() {
  const { eventId, privacy } = useLocalSearchParams<{ eventId: string; privacy: EventPrivacy }>();
  const { data, isLoading, error } = useEventShare(eventId);

  function handleClose() {
    router.back();
  }

  async function handleShare() {
    if (!data) return;
    await Share.share({
      message: `${data.title} — ${data.web_url}`,
      url: data.web_url,
      title: data.title,
    });
  }

  function handleViewEvent() {
    router.push({ pathname: '/Event/[id]', params: { id: eventId } });
  }

  const event: Event | null = data
    ? {
        id: eventId,
        title: data.title,
        date: data.event_date,
        location: data.location_name,
        imageUrl: data.cover_photo_url,
        privacy,
      }
    : null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="x" accessibilityLabel="Fechar" variant="Ghost" onPress={handleClose} />
        <Text style={styles.headerTitle}>Evento publicado</Text>
      </View>

      {isLoading && (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.action.primary} />
        </View>
      )}

      {!isLoading && error && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isLoading && !error && event && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successIcon}>
            <Icon name="circle-check" size={40} color={palette.success.default} />
          </View>

          <Text style={styles.title}>Seu evento está no ar</Text>
          <Text style={styles.subtitle}>
            &quot;{event.title}&quot; já aparece no feed de quem segue os interesses do evento e no
            mapa Ao Vivo no dia do evento.
          </Text>

          <EventCard variant="Compact" event={event} onPress={handleViewEvent} />
        </ScrollView>
      )}

      <View style={styles.actions}>
        <Button
          label="Compartilhar link"
          icon="share-2"
          variant="Primary"
          size="LG"
          accessibilityLabel="Compartilhar link do evento"
          onPress={handleShare}
          style={styles.fullWidth}
        />
        <Button
          label="Ver o evento"
          variant="Tertiary"
          size="LG"
          accessibilityLabel="Ver o evento"
          onPress={handleViewEvent}
          style={styles.fullWidth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: { ...typography.h4, color: colors.text.primary },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.bodyM, color: colors.feedback.error },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing[24],
    paddingTop: spacing[64],
    gap: spacing[16],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.success.bg,
    marginBottom: spacing[8],
  },
  title: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
  subtitle: { ...typography.bodyM, color: colors.text.secondary, textAlign: 'center' },
  actions: {
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[24],
    paddingTop: spacing[12],
    gap: spacing[8],
  },
  fullWidth: { alignSelf: 'stretch' },
});