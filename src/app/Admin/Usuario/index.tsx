import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminUser } from '@/hooks/useAdminUser';
import { useModerateUser } from '@/hooks/useModerateUser';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import type { AdminUserProfile } from '@/types/admin';

const HEADER_HEIGHT = 56;
const HEADER_BORDER_WIDTH = 1.5;
const OFFLINE_BANNER_OFFSET = spacing[64];

const AVATAR_DIAMETER = 80;

/** Altura mínima do StatCard — igual ao Painel. */
const STAT_CARD_BORDER_WIDTH = 1;
const STAT_CARD_MIN_HEIGHT =
  STAT_CARD_BORDER_WIDTH * 2 +
  spacing[16] * 2 +
  typography.overline.lineHeight +
  typography.h1.lineHeight +
  typography.bodyS.lineHeight +
  spacing[4] * 2;

/** Padding horizontal da área de ações fixas no rodapé. */
const FOOTER_PADDING_H = spacing[16];
const FOOTER_PADDING_V = spacing[16];

const SKELETON_NAME_WIDTH = '50%';
const SKELETON_META_WIDTH = '65%';
const SKELETON_BADGE_WIDTH = '22%';
const SKELETON_STAT_LABEL_WIDTH = '70%';
const SKELETON_STAT_VALUE_WIDTH = '35%';
const SKELETON_STAT_SUPPORT_WIDTH = '55%';
const SKELETON_HISTORY_WIDTHS = ['80%', '65%', '72%'] as const;

type DialogKind = 'ban' | 'suspend' | 'revert' | null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDayMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function actionLabel(profile: AdminUserProfile): string {
  if (profile.moderation_status === 'BANNED') return 'Reverter banimento';
  if (profile.moderation_status === 'SUSPENDED') return 'Reverter suspensão';
  return 'Banir usuário';
}

function dialogKindForProfile(profile: AdminUserProfile): DialogKind {
  if (profile.moderation_status === 'BANNED' || profile.moderation_status === 'SUSPENDED') return 'revert';
  return 'ban';
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

type UsuarioHeaderProps = { name: string; onBack: () => void };

function UsuarioHeader({ name, onBack }: UsuarioHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={spacing[8]}
        style={({ pressed }) => pressed && { opacity: pressedOpacity }}
      >
        <Icon name="arrow-left" size={24} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {name}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <View style={[styles.statSkeleton]}>
      <Skeleton width={SKELETON_STAT_LABEL_WIDTH} height={typography.overline.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_VALUE_WIDTH} height={typography.h1.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_SUPPORT_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
    </View>
  );
}

function UsuarioSkeleton() {
  return (
    <View
      style={styles.scrollContent}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando ficha do usuário"
      accessibilityState={{ busy: true }}
    >
      {/* Perfil centralizado */}
      <View style={styles.profileSection}>
        <Skeleton width={AVATAR_DIAMETER} height={AVATAR_DIAMETER} radius="full" />
        <Skeleton width={SKELETON_NAME_WIDTH} height={typography.h2.lineHeight} radius="full" style={styles.skeletonNameGap} />
        <Skeleton width={SKELETON_META_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
        <Skeleton width={SKELETON_BADGE_WIDTH} height={layout.badge.height} radius="full" style={styles.skeletonBadgeGap} />
      </View>

      {/* StatCards */}
      <View style={styles.statRow}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>

      {/* Histórico */}
      <SectionHeader title="HISTÓRICO DE MODERAÇÃO" variant="overline" />
      <View style={styles.historyList}>
        {SKELETON_HISTORY_WIDTHS.map((w, i) => (
          <Skeleton key={i} width={w} height={typography.bodyM.lineHeight} radius="full" />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo com scroll
// ---------------------------------------------------------------------------

type UsuarioContentProps = {
  profile: AdminUserProfile;
  refresh: () => Promise<void>;
  onViewReports: () => void;
  onAction: (kind: DialogKind) => void;
};

function UsuarioContent({ profile, refresh, onViewReports, onAction }: UsuarioContentProps) {
  const { isRefreshing, onRefresh } = useRefreshable(refresh);

  const reportsTone = profile.reports_received > 0 ? 'Alert' : 'Neutral';
  const reportsSupport = profile.reports_upheld > 0
    ? `${profile.reports_upheld} procedente${profile.reports_upheld > 1 ? 's' : ''}`
    : undefined;
  const eventsSupport = profile.events_cancelled > 0
    ? `${profile.events_cancelled} cancelado${profile.events_cancelled > 1 ? 's' : ''}`
    : undefined;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.action.primary}
          colors={[colors.action.primary]}
        />
      }
    >
      {/* Perfil */}
      <View style={styles.profileSection}>
        <Avatar
          variant="User"
          diameter={AVATAR_DIAMETER}
          source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
          accessibilityLabel={`Foto de ${profile.name}`}
        />
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileMeta}>
          {profile.email} · conta desde {formatMonthYear(profile.joined_at)}
        </Text>
        <View style={styles.badgeWrap}>
          <Badge family="Moderation" value={profile.moderation_status} />
        </View>
      </View>

      {/* StatCards — apenas Eventos e Denúncias */}
      <View style={styles.statRow}>
        <StatCard
          label="EVENTOS"
          value={profile.events_created}
          support={eventsSupport}
          tone="Neutral"
          style={styles.statCard}
        />
        <StatCard
          label="DENÚNCIAS"
          value={profile.reports_received}
          support={reportsSupport}
          tone={reportsTone}
          style={styles.statCard}
        />
      </View>

      {/* Histórico de moderação */}
      <SectionHeader title="HISTÓRICO DE MODERAÇÃO" variant="overline" />
      {profile.moderation_history.length === 0 ? (
        <Text style={styles.historyEmpty}>Nenhuma ação registrada.</Text>
      ) : (
        <View style={styles.historyList}>
          {profile.moderation_history.map((entry, i) => (
            <Text key={i} style={styles.historyEntry}>
              <Text style={styles.historyDate}>{formatDayMonth(entry.occurred_at)}</Text>
              {' — '}{entry.description}
            </Text>
          ))}
        </View>
      )}

      {/* Espaço para o rodapé fixo não cobrir o conteúdo */}
      <View style={styles.footerSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Rodapé fixo com ações
// ---------------------------------------------------------------------------

type UsuarioFooterProps = {
  profile: AdminUserProfile;
  isModerating: boolean;
  onAction: (kind: DialogKind) => void;
  onViewReports: () => void;
};

function UsuarioFooter({ profile, isModerating, onAction, onViewReports }: UsuarioFooterProps) {
  const kind = dialogKindForProfile(profile);
  const label = actionLabel(profile);
  const variant = kind === 'ban' ? 'Danger' : 'Secondary';
  const hasReports = profile.reports_received > 0;

  return (
    <View style={styles.footer}>
      <Button
        label={label}
        variant={variant}
        isLoading={isModerating}
        onPress={() => onAction(kind)}
        accessibilityLabel={label}
      />
      {hasReports && (
        <Pressable
          onPress={onViewReports}
          accessibilityRole="button"
          accessibilityLabel={`Ver as ${profile.reports_received} denúncias deste usuário`}
          hitSlop={spacing[8]}
          style={({ pressed }) => [styles.reportsLink, pressed && { opacity: pressedOpacity }]}
        >
          <Text style={styles.reportsLinkText}>
            Ver as {profile.reports_received} denúncias
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela principal
// ---------------------------------------------------------------------------

export default function AdminUsuario() {
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId ?? '';
  const { data, error, refetch } = useAdminUser(userId);
  const { moderate, isLoading: isModerating } = useModerateUser(userId);
  const { isOffline } = useNetworkStatus();
  const { addToast } = useToast();
  const [dialogKind, setDialogKind] = useState<DialogKind>(null);

  const handleModerate = useCallback(async () => {
    if (!dialogKind || !data) return;

    const action = dialogKind === 'ban' ? 'BAN' : dialogKind === 'suspend' ? 'SUSPEND' : 'REVERT';

    let suspendedUntil: string | undefined;
    if (action === 'SUSPEND') {
      const until = new Date();
      until.setDate(until.getDate() + 7);
      suspendedUntil = until.toISOString();
    }

    setDialogKind(null);

    const result = await moderate(action, suspendedUntil);
    if (result.kind === 'done') {
      addToast({ type: 'success', message: moderateSuccessMessage(action) });
      void refetch();
    } else {
      addToast({ type: 'error', message: result.message });
    }
  }, [dialogKind, data, moderate, addToast, refetch]);

  const handleViewReports = useCallback(() => {
    // task 262 — fila de denúncias do usuário
  }, []);

  const body = (() => {
    if (data) {
      return (
        <UsuarioContent
          profile={data}
          refresh={refetch}
          onViewReports={handleViewReports}
          onAction={setDialogKind}
        />
      );
    }
    if (error) {
      return (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta={error.canRetry}
          ctaLabel="Tentar de novo"
          onCtaPress={() => { void refetch(); }}
          fill
        />
      );
    }
    return <UsuarioSkeleton />;
  })();

  return (
    <View style={styles.screen}>
      <UsuarioHeader name={data?.name ?? 'Usuário'} onBack={() => router.back()} />

      <View style={styles.bodyWrap}>
        <View style={[styles.bodyWrap, isOffline && styles.bodyBelowBanner]}>
          {body}
        </View>
        {isOffline && <OfflineBanner />}
      </View>

      {/* Rodapé fixo — só quando há dado */}
      {data && (
        <UsuarioFooter
          profile={data}
          isModerating={isModerating}
          onAction={setDialogKind}
          onViewReports={handleViewReports}
        />
      )}

      {/* Diálogos */}
      {data && (
        <>
          <Dialog
            visible={dialogKind === 'ban'}
            variant="BanUser"
            title={`Banir ${data.name}?`}
            onConfirm={() => { void handleModerate(); }}
            onCancel={() => setDialogKind(null)}
            isLoading={isModerating}
          />
          <Dialog
            visible={dialogKind === 'suspend'}
            variant="SuspendUser"
            title={`Suspender ${data.name}?`}
            description="O usuário ficará sem acesso ao app por 7 dias."
            onConfirm={() => { void handleModerate(); }}
            onCancel={() => setDialogKind(null)}
            isLoading={isModerating}
          />
          <Dialog
            visible={dialogKind === 'revert'}
            variant="RevertModeration"
            title={`Reverter moderação de ${data.name}?`}
            onConfirm={() => { void handleModerate(); }}
            onCancel={() => setDialogKind(null)}
            isLoading={isModerating}
          />
        </>
      )}
    </View>
  );
}

function moderateSuccessMessage(action: 'BAN' | 'SUSPEND' | 'REVERT'): string {
  if (action === 'BAN') return 'Usuário banido com sucesso';
  if (action === 'SUSPEND') return 'Usuário suspenso com sucesso';
  return 'Moderação revertida com sucesso';
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

/** Altura estimada do rodapé: botão LG (52) + link (20) + padding vertical (32) + gap (12). */
const FOOTER_HEIGHT = spacing[48] + spacing[4] + spacing[20] + FOOTER_PADDING_V * 2 + spacing[12];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    height: HEADER_HEIGHT + HEADER_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    borderBottomWidth: HEADER_BORDER_WIDTH,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  headerTitle: {
    ...typography.h4,
    flex: 1,
    color: colors.text.primary,
  },
  bodyWrap: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  scrollContent: {
    padding: spacing[16],
    gap: spacing[16],
  },
  // Perfil — centralizado
  profileSection: {
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[8],
  },
  profileName: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing[4],
  },
  profileMeta: {
    ...typography.bodyS,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  badgeWrap: {
    marginTop: spacing[4],
  },
  skeletonNameGap: {
    marginTop: spacing[8],
  },
  skeletonBadgeGap: {
    marginTop: spacing[4],
  },
  // StatCards
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing[12],
  },
  statCard: {
    flex: 1,
    minHeight: STAT_CARD_MIN_HEIGHT,
  },
  statSkeleton: {
    flex: 1,
    minHeight: STAT_CARD_MIN_HEIGHT,
    borderWidth: STAT_CARD_BORDER_WIDTH,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing[16],
    gap: spacing[4],
  },
  // Histórico
  historyList: {
    gap: spacing[12],
  },
  historyEntry: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  historyDate: {
    ...typography.labelM,
    color: colors.text.primary,
  },
  historyEmpty: {
    ...typography.bodyM,
    color: colors.text.tertiary,
  },
  // Espaço para o rodapé não cobrir o último item do scroll
  footerSpacer: {
    height: FOOTER_HEIGHT,
  },
  // Rodapé fixo
  footer: {
    paddingHorizontal: FOOTER_PADDING_H,
    paddingVertical: FOOTER_PADDING_V,
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  reportsLink: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  reportsLinkText: {
    ...typography.labelM,
    color: colors.text.brand,
    textAlign: 'center',
  },
});
