import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useConnections } from '@/hooks/useConnections';
import type { ConnectionItem, PendingConnectionItem } from '@/hooks/useConnections';
import { useTopAppBar } from '@/hooks/useTopAppBar';

const MIN_TOUCH = 44;

type ListEntry =
  | { kind: 'connected'; data: ConnectionItem }
  | { kind: 'pending'; data: PendingConnectionItem };

function entryKey(entry: ListEntry): string {
  return entry.kind === 'connected'
    ? `c-${entry.data.user_id}`
    : `p-${entry.data.connection_id}`;
}

function entryName(entry: ListEntry): string {
  return entry.kind === 'connected' ? entry.data.name : entry.data.user.name;
}

function Row({ entry }: { entry: ListEntry }) {
  const name = entryName(entry);
  const photoUrl = entry.kind === 'connected'
    ? entry.data.photo_url
    : entry.data.user.photo_url;
  const city = entry.kind === 'connected' ? entry.data.city : undefined;
  const isPending = entry.kind === 'pending';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${name}`}
      android_ripple={{ color: palette.primary[50] }}
    >
      <Avatar
        size="SM"
        variant="User"
        source={photoUrl ? { uri: photoUrl } : undefined}
        accessibilityLabel={name}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {city ? (
          <Text style={styles.rowSub} numberOfLines={1}>{city}</Text>
        ) : null}
      </View>
      <View style={[styles.pill, isPending ? styles.pillPending : styles.pillConnected]}>
        <Text style={[styles.pillText, isPending ? styles.pillTextPending : styles.pillTextConnected]}>
          {isPending ? 'Pendente' : 'Conectados'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Connections() {
  useTopAppBar({ variant: 'BrandBack' });

  const {
    connections,
    pendingConnections,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    search,
    setSearch,
    loadMore,
    reload,
  } = useConnections();

  const isSearching = search.trim().length > 0;

  const listData: ListEntry[] = [
    ...pendingConnections.map(d => ({ kind: 'pending' as const, data: d })),
    ...connections.map(d => ({ kind: 'connected' as const, data: d })),
  ].sort((a, b) => entryName(a).localeCompare(entryName(b), 'pt-BR', { sensitivity: 'base' }));

  const totalCount = connections.length;

  const ListHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>
        {totalCount > 0 ? `${totalCount} conexões` : 'Conexões'}
      </Text>
      <TextField
        type="Search"
        placeholder="Buscar conexões"
        value={search}
        onChangeText={setSearch}
        style={styles.searchField}
      />
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View style={styles.emptyContainer}>
      {error ? (
        <Text style={styles.emptyText}>{error}</Text>
      ) : isSearching ? (
        <Text style={styles.emptyText}>Nenhum resultado para "{search}".</Text>
      ) : (
        <Text style={styles.emptyText}>Você ainda não tem conexões.</Text>
      )}
    </View>
  ) : null;

  const ListFooter = isLoadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator color={colors.action.primary} />
    </View>
  ) : null;

  if (isLoading && listData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.action.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={entryKey}
        renderItem={({ item }) => <Row entry={item} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={hasMore ? () => { void loadMore(); } : undefined}
        onEndReachedThreshold={0.3}
        onRefresh={() => { void reload(); }}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing[24],
  },
  header: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
    gap: spacing[12],
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  searchField: {
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    minHeight: MIN_TOUCH,
    gap: spacing[12],
    backgroundColor: colors.bg.base,
  },
  rowPressed: {
    backgroundColor: palette.primary[50],
  },
  rowInfo: {
    flex: 1,
    gap: spacing[4],
  },
  rowName: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  rowSub: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  pill: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillConnected: {},
  pillPending: {
    borderWidth: 1.5,
    borderColor: colors.action.primary,
  },
  pillText: {
    ...typography.labelS,
  },
  pillTextConnected: {
    color: colors.action.primary,
  },
  pillTextPending: {
    color: colors.action.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingTop: spacing[48],
  },
  emptyText: {
    ...typography.bodyM,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
});
