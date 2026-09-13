import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/EventCard';
import type { EventPrivacy } from '@/components/EventCard/types';
import { IconButton } from '@/components/IconButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useEventShare } from '@/hooks/useEventShare';
import { useTopAppBar } from '@/hooks/useTopAppBar';

/**
 * Destino mínimo do fluxo pós-publicação. A tela de detalhe completa pode
 * ampliar este mesmo caminho sem quebrar os links já emitidos.
 */
export default function EventDetail() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    eventDate?: string;
    location?: string;
    imageUrl?: string;
    privacy?: EventPrivacy;
  }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useEventShare(params.id);
  useTopAppBar(null);

  const event = data
    ? {
        id: params.id ?? '',
        title: params.title ?? data.title,
        date: params.eventDate ?? data.event_date,
        location: params.location ?? data.location_name,
        imageUrl: params.imageUrl || data.cover_photo_url || '',
        privacy: params.privacy ?? 'PUBLIC',
      }
    : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[12] }]}>
        <IconButton icon="arrow-left" accessibilityLabel="Voltar" variant="Ghost" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Evento</Text>
      </View>

      {isLoading && <ActivityIndicator style={styles.loader} color={colors.action.primary} />}
      {!isLoading && event && <View style={styles.content}><EventCard variant="Featured" event={event} onPress={() => undefined} /></View>}
      {!isLoading && !event && <Text style={styles.error}>{error ?? 'Evento não encontrado'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[12], paddingHorizontal: spacing[16], paddingBottom: spacing[12], borderBottomWidth: 1, borderBottomColor: colors.border.default },
  headerTitle: { ...typography.h4, color: colors.text.primary },
  content: { padding: spacing[24] },
  loader: { marginTop: spacing[64] },
  error: { ...typography.bodyM, color: colors.feedback.error, margin: spacing[24] },
});
