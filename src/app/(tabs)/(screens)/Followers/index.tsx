import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useFollowers } from '@/hooks/useFollowers';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { Follower } from '@/types/profile';

/** Avatar de 40 do "Item/Seguidor"; a escala nomeada do `Avatar` começa em 48. */
const ROW_AVATAR_DIAMETER = 40;
/** Linhas do skeleton: o bastante para cobrir a primeira dobra de um celular. */
const SKELETON_ROW_COUNT = 6;
/** Larguras dos textos do skeleton, em fração da coluna de texto. */
const SKELETON_NAME_WIDTH = '55%';
const SKELETON_TAGS_WIDTH = '75%';
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): o conteúdo desce o
 * mesmo tanto para a busca não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

function tagsOf(follower: Follower) {
  return follower.tags.map(tag => tag.name).join(' · ');
}

/** Sem toque nesta task: o frame não tem chevron nem estado pressionado. */
function Row({ follower }: { follower: Follower }) {
  const tags = tagsOf(follower);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={tags ? `${follower.name}, interesses: ${tags}` : follower.name}
    >
      <Avatar
        variant="User"
        diameter={ROW_AVATAR_DIAMETER}
        source={follower.photo_url ? { uri: follower.photo_url } : undefined}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{follower.name}</Text>
        {tags ? <Text style={styles.rowTags} numberOfLines={1}>{tags}</Text> : null}
      </View>
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function FollowersSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando seguidores"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={ROW_AVATAR_DIAMETER} height={ROW_AVATAR_DIAMETER} radius="full" />
          <View style={styles.rowInfo}>
            <Skeleton width={SKELETON_NAME_WIDTH} height={typography.labelM.lineHeight} radius="xs" />
            <Skeleton width={SKELETON_TAGS_WIDTH} height={typography.bodyS.lineHeight} radius="xs" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Followers() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const {
    followers,
    total,
    query,
    activeQuery,
    isLoading,
    isSearching,
    isLoadingMore,
    error,
    forbidden,
    hasMore,
    loadMore,
    refresh,
    search,
  } = useFollowers();

  useTopAppBar({
    variant: 'Detail',
    title: total === null ? 'Seguidores' : `${total} ${total === 1 ? 'seguidor' : 'seguidores'}`,
  });

  // `403`: a conta não é estabelecimento. O hook já mostrou o toast.
  useEffect(() => {
    if (!forbidden) return;
    if (router.canGoBack()) router.back();
    else router.replace('/Profile');
  }, [forbidden]);

  const hasNoFollowers = !isLoading && !error && activeQuery === '' && followers.length === 0;
  // Sem ninguém para buscar, o campo some e fica só o estado vazio do frame.
  const showSearch = !(error && followers.length === 0) && !hasNoFollowers;

  const content = (() => {
    if (isLoading && followers.length === 0) return <FollowersSkeleton />;

    if (error && followers.length === 0) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={() => { void refresh(); }}
          fill
        />
      );
    }

    return (
      <FlatList
        data={followers}
        keyExtractor={follower => follower.user_id}
        renderItem={({ item }) => <Row follower={item} />}
        ItemSeparatorComponent={RowSeparator}
        ListEmptyComponent={
          activeQuery ? (
            <EmptyState
              context="Search"
              text={`Nenhum seguidor encontrado para "${activeQuery}".`}
              fill
            />
          ) : (
            <EmptyState
              context="Search"
              icon="users"
              title="Nenhum seguidor ainda"
              text="Quando alguém seguir o seu estabelecimento, a pessoa aparece aqui."
              fill
            />
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais" />
            </View>
          ) : undefined
        }
        onEndReached={hasMore ? () => { void loadMore(); } : undefined}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing[24] }]}
      />
    );
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.content, isOffline && styles.contentBelowBanner]}>
        {showSearch && (
          <View style={styles.searchBar}>
            <TextField
              type="Search"
              placeholder="Buscar seguidores"
              value={query}
              onChangeText={search}
              autoCapitalize="words"
            />
          </View>
        )}
        <View
          style={styles.content}
          accessibilityState={{ busy: isSearching }}
        >
          {content}
        </View>
      </View>
      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
  },
  contentBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  // Busca a 16 da barra e das laterais; a lista começa logo abaixo, com os 8
  // de cima da linha dentro do próprio item.
  searchBar: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  listContent: {
    flexGrow: 1,
  },
  skeleton: {
    gap: spacing[8],
  },
  separator: {
    height: spacing[8],
  },
  // "Item/Seguidor": 16 de margem lateral, linhas com gap 8.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    gap: spacing[12],
  },
  rowInfo: {
    flex: 1,
    gap: spacing[4],
  },
  rowName: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  rowTags: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
});
