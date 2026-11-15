import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { ErrorScreen } from '@/components/ErrorScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useConnections } from '@/hooks/useConnections';
import type { ConnectionItem, PendingConnectionItem } from '@/hooks/useConnections';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useRetryOnReconnect } from '@/hooks/useRetryOnReconnect';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { loadErrorScreenProps } from '@/utils/errorScreen';

/** Avatar de 40 do item "Item/Conexão" no frame; a escala nomeada do `Avatar` começa em 48. */
const ROW_AVATAR_DIAMETER = 40;
const MIN_TOUCH = 44;
const PILL_HEIGHT = 36;
const PILL_BORDER_WIDTH = 1.5;
/** Largura aproximada da pill "Conectados" no skeleton (label S + padding 16 dos dois lados). */
const PILL_SKELETON_WIDTH = 104;
/** Altura do `TextField` (`FIELD_HEIGHT`, interno ao componente). */
const SEARCH_FIELD_HEIGHT = 56;

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

function entryUserId(entry: ListEntry): string {
  return entry.kind === 'connected' ? entry.data.user_id : entry.data.user.id;
}

function openProfile(entry: ListEntry) {
  router.push({ pathname: '/UserProfile', params: { id: entryUserId(entry) } });
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
      onPress={() => openProfile(entry)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${isPending ? 'solicitação pendente' : 'conectados'}. Ver perfil`}
      android_ripple={{ color: palette.primary[50] }}
    >
      <Avatar
        variant="User"
        diameter={ROW_AVATAR_DIAMETER}
        source={photoUrl ? { uri: photoUrl } : undefined}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {city ? (
          <Text style={styles.rowSub} numberOfLines={1}>{city}</Text>
        ) : null}
      </View>
      {/* Mesma aparência do Button SM (Tertiary / Secondary) do frame, mas sem ser
          botão: o toque é da linha inteira, e um botão dentro dela seria aninhado. */}
      <View style={[styles.pill, isPending && styles.pillPending]}>
        <Text style={[styles.pillText, isPending ? styles.pillTextPending : styles.pillTextConnected]}>
          {isPending ? 'Pendente' : 'Conectados'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Connections() {

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

  // O total vem do perfil: a lista é paginada, e o tamanho dela é só o que já carregou.
  const { profile } = useMyProfile({ enabled: true });
  const totalCount = profile?.connections_count ?? null;
  useTopAppBar({
    variant: 'Detail',
    title:
      totalCount === null ? 'Conexões' : `${totalCount} ${totalCount === 1 ? 'conexão' : 'conexões'}`,
  });

  const isSearching = search.trim().length > 0;

  const listData: ListEntry[] = [
    ...pendingConnections.map(d => ({ kind: 'pending' as const, data: d })),
    ...connections.map(d => ({ kind: 'connected' as const, data: d })),
  ].sort((a, b) => entryName(a).localeCompare(entryName(b), 'pt-BR', { sensitivity: 'base' }));

  // Com lista na tela, o erro é só da página seguinte: não vira tela de erro.
  const loadFailure = error && listData.length === 0 ? error : null;
  // Reconectou: refaz a carga que falhou.
  const { isOffline } = useRetryOnReconnect(Boolean(loadFailure?.canRetry), reload);

  const ListHeader = (
    <View style={styles.header}>
      <TextField
        type="Search"
        placeholder="Buscar conexões"
        value={search}
        onChangeText={setSearch}
      />
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View style={styles.emptyContainer}>
      {isSearching ? (
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
      <View style={styles.container}>
        <ConnectionsSkeleton offline={isOffline} />
        {isOffline && <OfflineBanner />}
      </View>
    );
  }

  if (loadFailure) {
    return (
      <View style={styles.container}>
        <ErrorScreen
          {...loadErrorScreenProps(loadFailure, {
            onRetry: () => { void reload(); },
            retryAccessibilityLabel: 'Tentar carregar as conexões novamente',
          })}
        />
        {isOffline && <OfflineBanner />}
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
        ListEmptyComponent={ListEmpty ?? undefined}
        ListFooterComponent={ListFooter ?? undefined}
        ItemSeparatorComponent={RowSeparator}
        onEndReached={hasMore ? () => { void loadMore(); } : undefined}
        onEndReachedThreshold={0.3}
        onRefresh={() => { void reload(); }}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, isOffline && styles.contentBelowBanner]}
      />
      {isOffline && <OfflineBanner />}
    </View>
  );
}

/** Mesma métrica da `Row` (avatar 40, nome e cidade, pill 36) para a lista não saltar ao carregar. */
function ConnectionsSkeleton({ offline }: { offline: boolean }) {
  return (
    <View
      style={offline && styles.contentBelowBanner}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando conexões"
    >
      <View style={styles.header}>
        <Skeleton height={SEARCH_FIELD_HEIGHT} radius="md" />
      </View>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index}>
          {index > 0 && <RowSeparator />}
          <View style={styles.row}>
            <Skeleton width={ROW_AVATAR_DIAMETER} height={ROW_AVATAR_DIAMETER} radius="full" />
            <View style={styles.rowInfo}>
              <Skeleton width="60%" height={typography.labelM.lineHeight} />
              <Skeleton width="35%" height={typography.bodyS.lineHeight} />
            </View>
            <Skeleton width={PILL_SKELETON_WIDTH} height={PILL_HEIGHT} radius="full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  // O `OfflineBanner` é absoluto (top 8 + altura mínima 48): a lista desce o mesmo respiro das outras telas.
  contentBelowBanner: {
    paddingTop: spacing[64],
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing[24],
  },
  // No frame, a busca fica a 16 da barra e a lista começa 20 abaixo dela
  // (12 aqui + os 8 do padding da linha).
  header: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
  },
  // O "gap 8" da Lista/Conexões.
  separator: {
    height: spacing[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
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
  // Métricas do Button SM: altura 36, padding 16, Label S; borda 1.5 no Secondary.
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: spacing[16],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPending: {
    borderWidth: PILL_BORDER_WIDTH,
    borderColor: colors.action.primary,
    backgroundColor: colors.bg.base,
  },
  pillText: {
    ...typography.labelS,
  },
  pillTextConnected: {
    color: palette.primary[600],
  },
  pillTextPending: {
    color: colors.text.brand,
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
