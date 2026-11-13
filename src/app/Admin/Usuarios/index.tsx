import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { AdminHeader } from '@/components/AdminHeader';
import { AdminUserRow } from '@/components/AdminUserRow';
import { EmptyState } from '@/components/EmptyState';
import { ErrorScreen } from '@/components/ErrorScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ProfileTabs } from '@/components/ProfileTabs';
import type { ProfileTabItem } from '@/components/ProfileTabs';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useRetryOnReconnect } from '@/hooks/useRetryOnReconnect';
import type { AdminUser } from '@/types/admin';
import { announce } from '@/utils/accessibility';
import {
  ADMIN_USERS_SEARCH_MAX_LENGTH,
  adminUserRowProps,
  adminUsersAnnouncement,
} from '@/utils/adminUsers';
import type { AdminUsersStatusFilter } from '@/utils/adminUsers';
import { loadErrorScreenProps } from '@/utils/errorScreen';

const FILTER_TABS: ReadonlyArray<ProfileTabItem<AdminUsersStatusFilter>> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SUSPENDED', label: 'Suspensos' },
  { value: 'BANNED', label: 'Banidos' },
];

const EMPTY_TEXT_BY_FILTER: Record<AdminUsersStatusFilter, string> = {
  ALL: 'Nenhuma conta',
  SUSPENDED: 'Nenhuma conta suspensa',
  BANNED: 'Nenhuma conta banida',
};

const END_REACHED_THRESHOLD = 0.3;
/**
 * Na Web, o react-native-web trata qualquer rolagem como arrasto e tira o foco do campo,
 * inclusive a volta ao topo quando a busca responde.
 */
const KEYBOARD_DISMISS_MODE = Platform.OS === 'web' ? 'none' : 'on-drag';

const metrics = layout.adminUserRow;
/** Como no AdminUserRow: o padding de 8 do Figma conta a partir da borda externa. */
const ROW_PADDING = spacing[8] - metrics.borderWidth;
/** O `OfflineBanner` é absoluto (top 8 + altura mínima 48): os filtros descem o mesmo tanto que no Painel. */
const OFFLINE_BANNER_OFFSET = spacing[64];
/** As cinco linhas do frame. */
const SKELETON_ROW_COUNT = 5;
const SKELETON_NAME_WIDTH = '55%';
const SKELETON_SUMMARY_WIDTH = '75%';
const SKELETON_BADGE_WIDTH = spacing[64];

function userKey(user: AdminUser) {
  return user.user_id;
}

function renderUser({ item }: ListRenderItemInfo<AdminUser>) {
  return (
    <AdminUserRow
      {...adminUserRowProps(item)}
      onPress={() => router.push({ pathname: '/Admin/Usuarios/[id]', params: { id: item.user_id } })}
    />
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function UsersSkeleton() {
  return (
    <View
      style={[styles.listInset, styles.skeleton]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando contas"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={metrics.avatarSize} height={metrics.avatarSize} radius="full" />
          <View style={styles.skeletonTexts}>
            <Skeleton width={SKELETON_NAME_WIDTH} height={typography.labelM.lineHeight} radius="full" />
            <Skeleton width={SKELETON_SUMMARY_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
          </View>
          <Skeleton width={SKELETON_BADGE_WIDTH} height={layout.badge.height} radius="full" />
        </View>
      ))}
    </View>
  );
}

export default function AdminUsuarios() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminUsersStatusFilter>('ALL');
  // Muda só com a resposta: durante a digitação, o vazio ainda fala da busca que está na tela.
  const [settledSearch, setSettledSearch] = useState('');
  const listRef = useRef<FlatList<AdminUser>>(null);

  const { users, isLoading, isLoadingMore, error, refetch, reloadLoaded, loadMore, hasMore } = useAdminUsers({
    search,
    filter,
    onQuerySettled: summary => {
      setSettledSearch(search.trim());
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      announce(adminUsersAnnouncement(summary));
    },
  });
  const { isRefreshing, onRefresh } = useRefreshable(refetch);
  // `error` só existe sem lista na tela: com lista, a falha é toast e não há o que refazer sozinho.
  const { isOffline } = useRetryOnReconnect(Boolean(error?.canRetry), refetch);

  // O primeiro foco é a montagem, que já busca; os seguintes são a volta da ficha,
  // onde a conta pode ter sido moderada.
  const hasFocused = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }
    reloadLoaded();
  }, [reloadLoaded]));

  const list = (
    <FlatList
      ref={listRef}
      data={users}
      keyExtractor={userKey}
      renderItem={renderUser}
      ItemSeparatorComponent={RowSeparator}
      ListEmptyComponent={
        <EmptyState
          context="Search"
          icon={settledSearch ? undefined : 'users'}
          text={
            settledSearch
              ? `Nenhuma conta encontrada para "${settledSearch}"`
              : EMPTY_TEXT_BY_FILTER[filter]
          }
          fill
        />
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais contas" />
          </View>
        ) : undefined
      }
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.action.primary}
          colors={[colors.action.primary]}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={KEYBOARD_DISMISS_MODE}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.listInset, styles.listContent]}
    />
  );

  const content = (() => {
    // Antes do `error`: na troca de aba há um render com `isLoading` e o erro antigo.
    if (isLoading && users.length === 0 && !isRefreshing) return <UsersSkeleton />;

    if (error) {
      return (
        <ErrorScreen
          {...loadErrorScreenProps(error, {
            onRetry: () => { void refetch(); },
            retryAccessibilityLabel: 'Tentar de novo, carregar as contas',
          })}
        />
      );
    }

    return list;
  })();

  return (
    <View style={styles.screen}>
      <AdminHeader title="Usuários" />
      {/* O banner é absoluto: dentro deste container ele fica abaixo do header, e não sobre ele. */}
      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>
          <View style={styles.filters}>
            <TextField
              type="Search"
              label="Buscar conta"
              placeholder="Nome ou e-mail"
              accessibilityLabel="Buscar conta por nome ou e-mail"
              value={search}
              onChangeText={setSearch}
              maxLength={ADMIN_USERS_SEARCH_MAX_LENGTH}
              autoCapitalize="none"
            />
            <ProfileTabs
              variant="listHeader"
              items={FILTER_TABS}
              value={filter}
              onChange={setFilter}
              accessibilityLabel="Filtrar contas por situação"
            />
          </View>
          <View style={styles.body}>{content}</View>
        </View>
        {isOffline && <OfflineBanner />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  body: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  filters: {
    paddingTop: spacing[16],
    paddingHorizontal: spacing[16],
    gap: spacing[12],
  },
  listInset: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
  },
  listContent: {
    flexGrow: 1,
  },
  separator: {
    height: spacing[12],
  },
  skeleton: {
    gap: spacing[12],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: metrics.minHeight,
    borderWidth: metrics.borderWidth,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    padding: ROW_PADDING,
    gap: spacing[12],
  },
  skeletonTexts: {
    flex: 1,
    gap: metrics.textGap,
  },
  footer: {
    paddingTop: spacing[16],
    alignItems: 'center',
  },
});
