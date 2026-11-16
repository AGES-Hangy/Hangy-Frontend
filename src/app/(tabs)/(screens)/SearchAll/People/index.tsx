import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorScreen } from '@/components/ErrorScreen';
import { ListItem } from '@/components/ListItem';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRetryOnReconnect } from '@/hooks/useRetryOnReconnect';
import { useSearchPeople } from '@/hooks/useSearchPeople';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { loadErrorScreenProps } from '@/utils/errorScreen';
import { searchEmptyCopy } from '@/utils/searchFilters';

function RowSeparator() {
  return <View style={styles.separator} />;
}

export default function SearchAllPeople() {
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  const query = (Array.isArray(q) ? q[0] : q) ?? '';
  const {
    term, people, total, isLoading, isLoadingMore, error, hasMore,
    loadMore, retry, connectingId, connectPerson,
  } = useSearchPeople(query);
  const { user } = useCurrentUser();
  const { isOffline } = useRetryOnReconnect(error?.canRetry === true, retry);
  useTopAppBar({ variant: 'BrandBack' });

  const content = (() => {
    if (isLoading) {
      return (
        <View style={styles.skeleton} accessible accessibilityRole="progressbar" accessibilityLabel="Carregando pessoas">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} type="Item" />)}
        </View>
      );
    }

    if (error && people.length === 0) {
      return <ErrorScreen {...loadErrorScreenProps(error, { onRetry: isOffline ? undefined : retry })} />;
    }

    if (people.length === 0) {
      return <EmptyState context="Search" {...(term ? searchEmptyCopy(term) : {})} fill />;
    }

    return (
      <FlatList
        data={people}
        keyExtractor={person => person.user_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader title={`PESSOAS · ${total ?? people.length}`} variant="overline" />
          </View>
        }
        renderItem={({ item }) => {
          const name = item.name?.trim() || 'Usuário';
          const location = [item.city?.trim(), item.state?.trim()].filter(Boolean).join(', ');
          const description = item.description?.trim() || location;
          const relationship = item.connection_status === 'CONFIRMED' ? 'conectados'
            : item.connection_status === 'PENDING' ? 'solicitação pendente' : undefined;
          const subtitle = [description, relationship].filter(Boolean).join(' · ');
          const isSelf = user?.userId === item.user_id;
          const canConnect = user?.userType === 'PERSONAL' && !isSelf && item.connection_status === null;
          const isConnecting = connectingId === item.user_id;

          return (
            <ListItem
              type="Person"
              name={name}
              subtitle={subtitle || undefined}
              avatarUri={item.photo_url ?? undefined}
              onPress={() => router.push(isSelf ? '/Profile' : { pathname: '/UserProfile', params: { id: item.user_id } })}
              trailing={canConnect ? (
                <Button
                  label="Conectar"
                  variant="Secondary"
                  size="MD"
                  accessibilityLabel={`Conectar com ${name}`}
                  disabled={isOffline || (connectingId !== null && !isConnecting)}
                  isLoading={isConnecting}
                  onPress={() => {
                    if (!isOffline) void connectPerson(item.user_id);
                  }}
                />
              ) : undefined}
            />
          );
        }}
        onEndReached={hasMore && !isOffline && !error ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoadingMore || error ? (
          <View style={styles.footer}>
            {isLoadingMore ? (
              <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais pessoas" />
            ) : error ? (
              <>
                <Text style={styles.note} accessibilityLiveRegion="polite">{error.message}</Text>
                {error.canRetry && (
                  <Button label="Tentar de novo" variant="Secondary" size="SM" disabled={isOffline} onPress={retry} />
                )}
              </>
            ) : null}
          </View>
        ) : undefined}
      />
    );
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.content, isOffline && styles.belowBanner]}>{content}</View>
      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  content: { flex: 1 },
  belowBanner: { paddingTop: spacing[64] },
  list: { paddingHorizontal: spacing[16], paddingBottom: spacing[12] },
  header: { paddingVertical: spacing[12] },
  separator: { height: spacing[8] },
  skeleton: { padding: spacing[16], gap: spacing[8] },
  footer: { alignItems: 'center', gap: spacing[8], paddingVertical: spacing[16] },
  note: { ...typography.bodyS, color: colors.text.secondary, textAlign: 'center' },
});
