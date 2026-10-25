import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUnblockUser } from '@/hooks/useUnblockUser';
import type { BlockedUser } from '@/types/profile';
import { formatDayMonth } from '@/utils/datetime';

/** Avatar de 40 da linha, o mesmo da lista de Conexões; a escala nomeada do `Avatar` começa em 48. */
const ROW_AVATAR_DIAMETER = 40;
/** Linhas do skeleton: o bastante para cobrir a primeira dobra de um celular. */
const SKELETON_ROW_COUNT = 6;
/** Larguras dos textos do skeleton, em fração da coluna de texto. */
const SKELETON_NAME_WIDTH = '60%';
const SKELETON_DATE_WIDTH = '35%';
/** Largura do botão "Desbloquear" SM (label S + padding 16 dos dois lados). */
const SKELETON_BUTTON_WIDTH = 108;
const SKELETON_BUTTON_HEIGHT = 36;
/**
 * O `OfflineBanner` é absoluto (top 8 + altura mínima 48): a lista desce o
 * mesmo tanto para a primeira linha não ficar por baixo dele.
 */
const OFFLINE_BANNER_OFFSET = spacing[64];

function blockedSince(user: BlockedUser) {
  const date = formatDayMonth(user.blocked_at);
  return date ? `Bloqueado em ${date}` : null;
}

type RowProps = {
  user: BlockedUser;
  disabled: boolean;
  onUnblock: (user: BlockedUser) => void;
};

/**
 * A linha não abre o perfil: quem bloqueou não vê o perfil de quem foi
 * bloqueado. O único tocável é o botão, então não há alvo aninhado.
 */
function Row({ user, disabled, onUnblock }: RowProps) {
  const since = blockedSince(user);

  return (
    <View style={styles.row}>
      <Avatar
        variant="User"
        diameter={ROW_AVATAR_DIAMETER}
        source={user.photo_url ? { uri: user.photo_url } : undefined}
      />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{user.name}</Text>
        {since ? <Text style={styles.rowSub} numberOfLines={1}>{since}</Text> : null}
      </View>
      <Button
        label="Desbloquear"
        variant="Secondary"
        size="SM"
        disabled={disabled}
        onPress={() => onUnblock(user)}
        accessibilityLabel={`Desbloquear ${user.name}`}
      />
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.separator} />;
}

function BlockedUsersSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando usuários bloqueados"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={ROW_AVATAR_DIAMETER} height={ROW_AVATAR_DIAMETER} radius="full" />
          <View style={styles.rowInfo}>
            <Skeleton width={SKELETON_NAME_WIDTH} height={typography.labelM.lineHeight} radius="xs" />
            <Skeleton width={SKELETON_DATE_WIDTH} height={typography.bodyS.lineHeight} radius="xs" />
          </View>
          <Skeleton width={SKELETON_BUTTON_WIDTH} height={SKELETON_BUTTON_HEIGHT} radius="full" />
        </View>
      ))}
    </View>
  );
}

export default function BlockedUsers() {
  useTopAppBar({ variant: 'Detail', title: 'Usuários bloqueados' });

  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const { users, isLoading, isLoadingMore, error, hasMore, loadMore, refresh, removeUser, restoreUser } =
    useBlockedUsers();
  const { unblockUser, isLoading: isUnblocking } = useUnblockUser();

  /** Quem está no diálogo de confirmação; `null` com o diálogo fechado. */
  const [target, setTarget] = useState<BlockedUser | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const performUnblock = useCallback(async (user: BlockedUser, index: number) => {
    setTarget(user);
    // Otimista: o item some na hora e volta se o `DELETE` falhar.
    removeUser(user.user_id);
    const result = await unblockUser(user.user_id);
    if (!mounted.current) return;

    switch (result.kind) {
      case 'done':
        setTarget(null);
        addToast({ type: 'success', message: 'Usuário desbloqueado' });
        return;
      case 'gone':
        // Já desbloqueado em outro aparelho: o resultado que a pessoa pediu já vale.
        setTarget(null);
        addToast({ type: 'info', message: 'Esse usuário já foi desbloqueado' });
        return;
      case 'failed':
        restoreUser(user, index);
        setTarget(null);
        addToast({
          type: 'error',
          message: result.message,
          ...(result.retryable && {
            actionLabel: 'Tentar de novo',
            onAction: () => { void performUnblock(user, index); },
          }),
        });
        return;
      case 'ignored':
        restoreUser(user, index);
        return;
      case 'expired':
        // O `apiFetch` já mostrou a sessão expirada e voltou para o Login.
        return;
    }
  }, [addToast, removeUser, restoreUser, unblockUser]);

  const confirmUnblock = () => {
    if (!target || isUnblocking || isOffline) return;
    const index = users.findIndex(user => user.user_id === target.user_id);
    void performUnblock(target, index === -1 ? users.length : index);
  };

  const closeDialog = () => {
    if (isUnblocking) return;
    setTarget(null);
  };

  const content = (() => {
    if (isLoading && users.length === 0) return <BlockedUsersSkeleton />;

    if (error && users.length === 0) {
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
        data={users}
        keyExtractor={user => user.user_id}
        renderItem={({ item }) => (
          <Row user={item} disabled={isOffline || isUnblocking} onUnblock={setTarget} />
        )}
        ItemSeparatorComponent={RowSeparator}
        ListEmptyComponent={
          <EmptyState
            context="Search"
            icon="ban"
            title="Nenhum usuário bloqueado"
            text="Quem você bloquear aparece aqui, e você pode desbloquear quando quiser."
            fill
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.action.primary} accessibilityLabel="Carregando mais" />
            </View>
          ) : null
        }
        onEndReached={hasMore ? () => { void loadMore(); } : undefined}
        onEndReachedThreshold={0.3}
        onRefresh={() => { void refresh(); }}
        refreshing={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing[24] }]}
      />
    );
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.content, isOffline && styles.contentBelowBanner]}>{content}</View>
      {isOffline && <OfflineBanner />}

      <Dialog
        visible={target !== null}
        variant="Unblock"
        title={target ? `Desbloquear ${target.name}?` : undefined}
        isLoading={isUnblocking}
        confirmDisabled={isOffline}
        onConfirm={confirmUnblock}
        onCancel={closeDialog}
      />
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
  // No frame, "Lista/Bloqueados" começa 16 abaixo da barra; os 8 de cima da
  // linha ficam dentro do "Item/Bloqueado" (altura 56, padding vertical 8).
  listContent: {
    flexGrow: 1,
    paddingTop: spacing[16],
  },
  skeleton: {
    paddingTop: spacing[16],
    gap: spacing[8],
  },
  separator: {
    height: spacing[8],
  },
  // "Item/Bloqueado": a lista tem 16 de margem lateral e as linhas, gap 8.
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
  rowSub: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  footer: {
    paddingVertical: spacing[16],
    alignItems: 'center',
  },
});
