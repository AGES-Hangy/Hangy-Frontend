import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { colors, palette } from '@/constants/colors';
import { layout, pressedOpacity, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAdminUser } from '@/hooks/useAdminUser';
import { useModerateUser } from '@/hooks/useModerateUser';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import type { AdminUserProfile, UserModerationStatus } from '@/types/admin';

/** Mesma altura do header do Painel (56 + borda 1.5). */
const HEADER_HEIGHT = 56;
const HEADER_BORDER_WIDTH = 1.5;
/** Offset do OfflineBanner — mesmo padrão do Painel. */
const OFFLINE_BANNER_OFFSET = spacing[64];

/** Borda do StatCard — igual à do Painel. */
const STAT_CARD_BORDER_WIDTH = 1;
const STAT_CARD_MIN_HEIGHT =
  STAT_CARD_BORDER_WIDTH * 2 +
  spacing[16] * 2 +
  typography.overline.lineHeight +
  typography.h1.lineHeight +
  typography.bodyS.lineHeight +
  spacing[4] * 2;

/** Largura do Avatar na seção de perfil — LG (112). */
const AVATAR_DIAMETER = 112;

/** Larguras das barras do skeleton. */
const SKELETON_NAME_WIDTH = '55%';
const SKELETON_EMAIL_WIDTH = '70%';
const SKELETON_BADGE_WIDTH = '25%';
const SKELETON_META_WIDTH = '45%';
const SKELETON_STAT_LABEL_WIDTH = '70%';
const SKELETON_STAT_VALUE_WIDTH = '40%';
const SKELETON_STAT_SUPPORT_WIDTH = '55%';

/** Número de cards de estatística por linha. */
const STATS_PER_ROW = 2;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

/** Texto de apoio do StatCard de suspensão, ou `undefined` para os outros. */
function suspendedSupport(profile: AdminUserProfile): string | undefined {
  if (profile.moderation_status !== 'SUSPENDED' || !profile.suspended_until) return undefined;
  return `até ${formatShortDate(profile.suspended_until)}`;
}

/** Texto de apoio do StatCard de banimento, ou `undefined` para os outros. */
function bannedSupport(profile: AdminUserProfile): string | undefined {
  if (profile.moderation_status !== 'BANNED' || !profile.banned_at) return undefined;
  return `em ${formatShortDate(profile.banned_at)}`;
}

type DialogKind = 'ban' | 'suspend' | 'revert' | null;

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
    <View style={[styles.skeletonCard, styles.statSkeleton]}>
      <Skeleton width={SKELETON_STAT_LABEL_WIDTH} height={typography.overline.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_VALUE_WIDTH} height={typography.h1.lineHeight} radius="full" />
      <Skeleton width={SKELETON_STAT_SUPPORT_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
    </View>
  );
}

function UsuarioSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando ficha do usuário"
      accessibilityState={{ busy: true }}
    >
      {/* Perfil */}
      <View style={styles.profileSection}>
        <Skeleton width={AVATAR_DIAMETER} height={AVATAR_DIAMETER} radius="full" />
        <View style={styles.profileTexts}>
          <Skeleton width={SKELETON_NAME_WIDTH} height={typography.h3.lineHeight} radius="full" />
          <Skeleton width={SKELETON_EMAIL_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
          <Skeleton width={SKELETON_BADGE_WIDTH} height={layout.badge.height} radius="full" />
          <Skeleton width={SKELETON_META_WIDTH} height={typography.bodyS.lineHeight} radius="full" />
        </View>
      </View>

      {/* Métricas */}
      <SectionHeader title="MÉTRICAS" variant="overline" />
      <View style={styles.statRow}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>
      <View style={styles.statRow}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>

      {/* Histórico */}
      <SectionHeader title="HISTÓRICO" variant="overline" />
      <View style={styles.skeletonCard}>
        <Skeleton width="60%" height={typography.bodyM.lineHeight} radius="full" />
        <Skeleton width="45%" height={typography.bodyS.lineHeight} radius="full" style={{ marginTop: spacing[8] }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo
// ---------------------------------------------------------------------------

type UsuarioContentProps = {
  profile: AdminUserProfile;
  refresh: () => Promise<void>;
  onAction: (kind: DialogKind) => void;
};

function UsuarioContent({ profile, refresh, onAction }: UsuarioContentProps) {
  const { isRefreshing, onRefresh } = useRefreshable(refresh);

  const stats = buildStats(profile);
  const rowCount = Math.ceil(stats.length / STATS_PER_ROW);
  const isActive = profile.moderation_status === 'ACTIVE';
  const isSuspendedOrBanned = profile.moderation_status === 'SUSPENDED' || profile.moderation_status === 'BANNED';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.action.primary}
          colors={[colors.action.primary]}
        />
      }
    >
      {/* Seção de perfil */}
      <View style={styles.profileSection}>
        <Avatar
          variant="User"
          diameter={AVATAR_DIAMETER}
          source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
          accessibilityLabel={`Foto de ${profile.name}`}
        />
        <View style={styles.profileTexts}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail} numberOfLines={1}>{profile.email}</Text>
          <Badge family="Moderation" value={profile.moderation_status} />
          <Text style={styles.profileMeta}>
            Membro desde {formatDate(profile.joined_at)}
          </Text>
        </View>
      </View>

      {/* Métricas */}
      <SectionHeader title="MÉTRICAS" variant="overline" />
      {Array.from({ length: rowCount }, (_, row) => (
        <View key={row} style={styles.statRow}>
          {stats.slice(row * STATS_PER_ROW, (row + 1) * STATS_PER_ROW).map(({ key, ...stat }) => (
            <StatCard key={key} {...stat} style={styles.statCard} />
          ))}
        </View>
      ))}

      {/* Histórico */}
      <SectionHeader
        title="HISTÓRICO"
        variant="overline"
        action={profile.reports_received > 0}
        actionLabel={`Ver as ${profile.reports_received} denúncias`}
        actionAccessibilityLabel={`Ver as ${profile.reports_received} denúncias deste usuário`}
        onActionPress={() => {
          // task 262 — fila de denúncias do usuário; por ora navega de volta
        }}
      />
      <HistoryCard profile={profile} />

      {/* Ações de moderação */}
      <SectionHeader title="MODERAÇÃO" variant="overline" />
      <View style={styles.actions}>
        {isActive && (
          <>
            <Button
              label="Suspender"
              variant="Secondary"
              onPress={() => onAction('suspend')}
              accessibilityLabel="Suspender este usuário"
            />
            <Button
              label="Banir"
              variant="Danger"
              onPress={() => onAction('ban')}
              accessibilityLabel="Banir este usuário"
            />
          </>
        )}
        {isSuspendedOrBanned && (
          <Button
            label="Reverter"
            variant="Secondary"
            onPress={() => onAction('revert')}
            accessibilityLabel="Reverter moderação deste usuário"
          />
        )}
      </View>
    </ScrollView>
  );
}

type HistoryCardProps = { profile: AdminUserProfile };

function HistoryCard({ profile }: HistoryCardProps) {
  return (
    <View style={styles.historyCard}>
      <HistoryRow
        label="Eventos criados"
        value={String(profile.events_created)}
      />
      <HistoryRow
        label="Denúncias recebidas"
        value={String(profile.reports_received)}
        tone={profile.reports_received > 0 ? 'Alert' : 'Neutral'}
      />
      <HistoryRow
        label="Denúncias abertas"
        value={String(profile.reports_open)}
        tone={profile.reports_open > 0 ? 'Alert' : 'Neutral'}
        last
      />
    </View>
  );
}

type HistoryRowProps = {
  label: string;
  value: string;
  tone?: 'Neutral' | 'Alert';
  last?: boolean;
};

function HistoryRow({ label, value, tone = 'Neutral', last = false }: HistoryRowProps) {
  const valueColor = tone === 'Alert' ? palette.error.default : colors.text.primary;

  return (
    <View style={[styles.historyRow, !last && styles.historyRowDivider]}>
      <Text style={styles.historyLabel}>{label}</Text>
      <Text style={[styles.historyValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers de dados
// ---------------------------------------------------------------------------

type StatItem = {
  key: string;
  label: string;
  value: string | number;
  support?: string;
  tone?: 'Neutral' | 'Alert' | 'Success';
};

function buildStats(profile: AdminUserProfile): StatItem[] {
  const statusTone = ((): 'Success' | 'Alert' | 'Neutral' => {
    if (profile.moderation_status === 'ACTIVE') return 'Success';
    if (profile.moderation_status === 'BANNED') return 'Alert';
    return 'Neutral';
  })();

  return [
    {
      key: 'status',
      label: 'Status',
      value: resolveModerationLabel(profile.moderation_status),
      support: suspendedSupport(profile) ?? bannedSupport(profile),
      tone: statusTone,
    },
    {
      key: 'events',
      label: 'Eventos',
      value: profile.events_created,
      tone: 'Neutral' as const,
    },
    {
      key: 'reports',
      label: 'Denúncias',
      value: profile.reports_received,
      tone: profile.reports_received > 5 ? 'Alert' as const : 'Neutral' as const,
    },
    {
      key: 'open',
      label: 'Abertas',
      value: profile.reports_open,
      tone: profile.reports_open > 0 ? 'Alert' as const : 'Neutral' as const,
    },
  ];
}

function resolveModerationLabel(status: UserModerationStatus): string {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'SUSPENDED') return 'Suspenso';
  return 'Banido';
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

    // Para suspensão, usamos 7 dias como padrão — sem campo de data por ora.
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

  const content = (() => {
    if (data) {
      return (
        <UsuarioContent
          profile={data}
          refresh={refetch}
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
      <UsuarioHeader
        name={data?.name ?? 'Usuário'}
        onBack={() => router.back()}
      />

      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>
          {content}
        </View>
        {isOffline && <OfflineBanner />}
      </View>

      {/* Diálogos de confirmação */}
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
  body: {
    flex: 1,
  },
  bodyBelowBanner: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  content: {
    padding: spacing[16],
    gap: spacing[16],
  },
  // Seção de perfil
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[16],
  },
  profileTexts: {
    flex: 1,
    gap: spacing[4],
    paddingTop: spacing[4],
  },
  profileName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  profileEmail: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  profileMeta: {
    ...typography.bodyS,
    color: colors.text.tertiary,
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
  // Histórico
  historyCard: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  historyRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  historyLabel: {
    ...typography.bodyM,
    color: colors.text.secondary,
    flex: 1,
  },
  historyValue: {
    ...typography.labelM,
  },
  // Ações
  actions: {
    gap: spacing[12],
  },
  // Skeleton
  skeletonCard: {
    borderColor: colors.border.default,
    borderRadius: radius.md,
    backgroundColor: colors.bg.base,
  },
  statSkeleton: {
    flex: 1,
    minHeight: STAT_CARD_MIN_HEIGHT,
    borderWidth: STAT_CARD_BORDER_WIDTH,
    padding: spacing[16],
    gap: spacing[4],
  },
});
