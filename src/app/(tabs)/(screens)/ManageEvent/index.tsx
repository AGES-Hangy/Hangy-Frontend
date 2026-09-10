import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { useToast } from '@/components/Toast';
import { EventCard } from '@/components/EventCard';
import { SectionHeader } from '@/components/SectionHeader';
// Placeholder: `NotificationItem` ainda não está no develop (task 157, sprint futura).
import { NotificationItem } from '@/components/_placeholders';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useCancelEvent } from '@/hooks/useCancelEvent';
import { useEvent } from '@/hooks/useEvent';
import { useEventParticipants } from '@/hooks/useEventParticipants';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import type { EventParticipant } from '@/types/event';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';

/** Confirmação aberta no momento — no máximo uma por vez. */
type Confirmation =
  | { kind: 'cancelEvent' }
  | { kind: 'removeParticipant'; participant: EventParticipant }
  | null;

/**
 * Gestão do evento — frames `Gerenciar meu evento`, `... - cancelar evento` e
 * `... - solicitação aprovada` do Figma.
 *
 * Aprovar e recusar não pedem confirmação; **remover** pede. O spinner é
 * sempre no card, nunca na tela: aprovar um pendente não pode congelar a
 * lista inteira. Toda essa lógica mora no `useEventParticipants` — aqui só
 * fica o layout e quem chama o quê.
 */
export default function ManageEvent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { addToast } = useToast();

  const { event, isLoading: isLoadingEvent, error: eventError, reload: reloadEvent } = useEvent(id);
  const participants = useEventParticipants(id);
  const { cancelEvent, isLoading: isCancelling } = useCancelEvent(id);

  /**
   * Qual confirmação está aberta. É um estado só, e não um booleano por
   * diálogo, porque dois `Modal` montados ao mesmo tempo no react-native-web
   * se atrapalham: abrir um mostrava o outro, com o conteúdo vazio. Com um
   * estado só existe um `Dialog` na árvore, e ele nunca fica ambíguo.
   */
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const share = useCallback(async () => {
    if (!event) return;
    await Share.share({
      title: event.title,
      message: `${event.title} — ${formatDateTime(event.event_date)} · ${event.location_name}`,
    });
  }, [event]);

  useTopAppBar({
    variant: 'Detail',
    title: 'Gerenciar evento',
    action: { icon: 'share', accessibilityLabel: 'Compartilhar evento', onPress: share },
  });

  async function onConfirm() {
    if (!confirmation) return;

    if (confirmation.kind === 'removeParticipant') {
      participants.remove(confirmation.participant);
      setConfirmation(null);
      return;
    }

    const cancelled = await cancelEvent();
    setConfirmation(null);
    // Só sai da tela se o backend confirmou: com 409 o evento continua lá.
    if (cancelled) router.replace('/Profile');
  }

  if (isLoadingEvent || participants.isLoading) return <ManageEventSkeleton />;

  const failure = eventError ?? participants.error;
  if (failure) {
    return (
      <View style={styles.errorScreen}>
        <EmptyState
          context="MyEvents"
          title={failure.title}
          text={failure.message}
          cta
          ctaLabel={failure.canRetry ? 'Tentar de novo' : 'Voltar'}
          onCtaPress={
            failure.canRetry
              ? () => {
                  reloadEvent();
                  participants.reload();
                }
              : router.back
          }
        />
      </View>
    );
  }

  const isLocked = participants.isReadOnly;
  const dialogCopy = describeConfirmation(confirmation, participants.confirmedCount);
  // A seção de pendentes não é renderizada quando a API nega — esconder é
  // melhor do que mostrar e negar no toque.
  const showPending = participants.canManage && participants.pendingCount > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {event && (
          <View style={styles.section}>
            <EventCard
              variant="Compact"
              event={{
                id: event.event_id,
                title: event.title,
                date: event.event_date,
                location: event.location_name,
                imageUrl: event.cover_photo_url ?? '',
                privacy: event.privacy,
              }}
              onPress={() => router.push(`/EventDetail?id=${event.event_id}`)}
            />
          </View>
        )}

        {isLocked && (
          <View style={styles.section}>
            <View style={styles.lockedBanner}>
              <Icon
                name="triangle-alert"
                size={20}
                color={palette.warning.default}
                absoluteStrokeWidth
              />
              <Text style={styles.lockedText}>
                Este evento não pode mais ser editado.
              </Text>
            </View>
          </View>
        )}

        {showPending && (
          <View style={styles.group}>
            <View style={styles.section}>
              <SectionHeader
                title={`SOLICITAÇÕES PENDENTES (${participants.pendingCount})`}
                variant="overline"
              />
            </View>

            <View style={[styles.section, styles.list]}>
              {participants.pending.map((person) => (
                <NotificationItem
                  key={person.participant_id}
                  title={person.name}
                  subtitle={`pediu para participar · ${formatRelativeTime(person.requested_at)}`}
                  avatarUri={person.avatar_url}
                  unread
                  isProcessing={participants.isProcessing(person.participant_id)}
                  // Evento lotado desabilita só o aprovar; recusar continua.
                  approveDisabled={participants.isFull || isLocked}
                  onApprove={() => participants.approve(person)}
                  onReject={() => participants.reject(person)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.group}>
          <View style={styles.section}>
            <SectionHeader
              title={`PARTICIPANTES (${participants.confirmedCount})`}
              variant="overline"
            />
          </View>

          {participants.confirmedCount === 0 ? (
            <EmptyState
              context="MyEvents"
              title="Ninguém confirmou presença ainda"
              text="Quando alguém confirmar, o nome aparece nesta lista."
            />
          ) : (
            <View style={styles.section}>
              {participants.confirmed.map((person) => (
                <ParticipantRow
                  key={person.participant_id}
                  name={person.name}
                  avatarUri={person.avatar_url}
                  onPress={() => router.push(`/Profile?userId=${person.user_id}&name=${person.name}`)}
                  onRemove={
                    isLocked ? undefined : () => setConfirmation({ kind: "removeParticipant", participant: person })
                  }
                  removeDisabled={participants.isProcessing(person.participant_id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing[20] }]}>
        <Button
          label="Editar evento"
          variant="Secondary"
          disabled={isLocked}
          onPress={() =>
            // A tela de edição é a US3.3; o botão já está no frame desta.
            addToast({ type: 'info', message: 'A edição do evento chega com a US3.3.' })
          }
          style={styles.actionButton}
        />
        <Button
          label="Cancelar evento"
          variant="Danger"
          disabled={isLocked}
          onPress={() => setConfirmation({ kind: "cancelEvent" })}
          style={styles.actionButton}
        />
      </View>

      <Dialog
        visible={confirmation !== null}
        variant="DeleteEvent"
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        // Só o cancelamento espera a rede; remover é otimista e fecha na hora.
        isLoading={confirmation?.kind === 'cancelEvent' && isCancelling}
        onConfirm={onConfirm}
        onCancel={() => setConfirmation(null)}
      />
    </View>
  );
}

/**
 * Cópia do diálogo de confirmação. Os dois textos dependem de dado — quantos
 * confirmados vão ser avisados, o nome de quem sai —, por isso não cabem numa
 * variante fixa do `Dialog`.
 */
function describeConfirmation(confirmation: Confirmation, confirmedCount: number) {
  if (confirmation?.kind === 'removeParticipant') {
    return {
      title: `Remover ${confirmation.participant.name}?`,
      description:
        'A pessoa deixa de constar na lista de participantes e é notificada da remoção.',
      confirmLabel: 'Remover',
    };
  }

  const avisados =
    confirmedCount === 1
      ? 'O confirmado recebe uma notificação'
      : `Os ${confirmedCount} confirmados recebem uma notificação`;

  return {
    title: 'Cancelar o evento?',
    description: `${avisados} e o evento sai do feed e da busca. Não dá para desfazer.`,
    confirmLabel: 'Cancelar evento',
  };
}

/** Linha de participante confirmado — não é um componente do Design System, só esta lista. */
type ParticipantRowProps = {
  name: string;
  avatarUri?: string | null;
  /** Sem isto a linha não mostra o botão de remover. */
  onRemove?: () => void;
  onPress?: () => void;
  removeDisabled?: boolean;
};

function ParticipantRow({
  name,
  avatarUri,
  onRemove,
  onPress,
  removeDisabled = false,
}: ParticipantRowProps) {
  return (
    <View style={styles.participantRow}>
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Abrir perfil de ${name}` : undefined}
        style={styles.participantMain}
      >
        <Avatar
          size="XS"
          source={avatarUri ? { uri: avatarUri } : undefined}
          accessibilityLabel={`Foto de ${name}`}
        />
        <Text style={styles.participantName} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>

      {onRemove && (
        <IconButton
          icon="x"
          size="SM"
          variant="Ghost"
          onPress={onRemove}
          disabled={removeDisabled}
          accessibilityLabel={`Remover ${name} do evento`}
        />
      )}
    </View>
  );
}

/** Esqueleto de participantes — nunca tela em branco enquanto o GET voa. */
function ManageEventSkeleton() {
  return (
    <View
      style={styles.screen}
      accessibilityLabel="Carregando participantes"
      accessibilityRole="progressbar"
    >
      <View style={styles.content}>
        <View style={styles.section}>
          <View style={[styles.skeletonBlock, styles.skeletonCard]} />
        </View>
        <View style={[styles.section, styles.list]}>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={[styles.skeletonBlock, styles.skeletonRow]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingTop: spacing[12],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  /** Padding lateral de tela — sempre 16, como manda o guia. */
  section: {
    paddingHorizontal: spacing[16],
  },
  group: {
    gap: spacing[8],
  },
  list: {
    gap: spacing[8],
  },

  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    padding: spacing[16],
    borderRadius: radius.md,
    backgroundColor: palette.warning.bg,
  },
  lockedText: {
    flex: 1,
    ...typography.bodyM,
    color: palette.warning.default,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    backgroundColor: colors.bg.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  actionButton: {
    flex: 1,
  },

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  participantMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  participantName: {
    flex: 1,
    ...typography.labelM,
    color: colors.text.primary,
  },

  skeletonBlock: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.sm,
  },
  skeletonCard: {
    height: 88,
    borderRadius: radius.md,
  },
  skeletonRow: {
    height: 56,
  },
});
