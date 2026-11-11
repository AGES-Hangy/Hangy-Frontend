import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Radio } from '@/components/Radio';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useReportReasons } from '@/hooks/useReportReasons';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  type ReportReason,
  type ReportReasonCode,
  type ReportTarget,
} from '@/types/report';
import { describeReportError } from '@/utils/reportErrors';

/**
 * Denunciar perfil ou evento — frames `Denunciar perfil` e `Denunciar evento`
 * da seção "Sprint 4 — Denúncia" do Figma.
 *
 * Uma tela só para os dois alvos, escolhidos por `?type=USER|EVENT&id=`. O
 * alvo muda o título, o texto de apoio e a lista de motivos — que vem da API
 * já dizendo o que está disponível para quem pede.
 */

/** Linhas do skeleton enquanto os motivos carregam — o perfil tem 7, como no frame. */
const SKELETON_ROWS = 7;
/** Altura de uma linha de motivo: a área de toque do `Radio`. */
const REASON_ROW_HEIGHT = 44;
/** Altura do `TextField` de descrição no frame. */
const DESCRIPTION_SKELETON_HEIGHT = 120;

const COPY: Record<ReportTarget, { title: string; support: string }> = {
  USER: {
    title: 'Denunciar perfil',
    support:
      'Sua denúncia é anônima e vai para a central de moderação. A pessoa denunciada não é avisada de que foi você.',
  },
  EVENT: {
    title: 'Denunciar evento',
    support:
      'Sua denúncia é anônima e vai para a central de moderação. O organizador não é avisado de que foi você.',
  },
};

const UNAVAILABLE_SUFFIX = {
  ALREADY_REPORTED: 'em análise',
  PARTICIPANTS_ONLY: 'só quem participou',
} as const;

function parseTarget(value: string | string[] | undefined): ReportTarget | undefined {
  return value === 'USER' || value === 'EVENT' ? value : undefined;
}

/** Sem `available` (backend sem a task 296), o motivo conta como disponível. */
function isAvailable(reason: ReportReason) {
  return reason.available !== false;
}

function reasonLabel(reason: ReportReason) {
  if (isAvailable(reason) || !reason.unavailable_reason) return reason.label;
  return `${reason.label} · ${UNAVAILABLE_SUFFIX[reason.unavailable_reason]}`;
}

export default function Report() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const target = parseTarget(params.type);
  const targetId = typeof params.id === 'string' && params.id ? params.id : undefined;
  const copy = COPY[target ?? 'USER'];

  const insets = useSafeAreaInsets();
  const { addToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const { reasons, isLoading, error: loadError, reload } = useReportReasons(target, targetId);
  const { submit, isLoading: isSubmitting } = useSubmitReport();

  const [selected, setSelected] = useState<ReportReasonCode | null>(null);
  const [description, setDescription] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/Home');
  }, []);

  useTopAppBar({ variant: 'Modal', title: copy.title, onBack: close });

  // A tela continua montada entre uma denúncia e outra (navegador de abas):
  // cada visita começa do zero, sem o motivo e o texto da anterior.
  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      setDescription('');
      setInlineError(null);
    }, [target, targetId]),
  );

  // O motivo escolhido pode ter ficado indisponível no recarregamento (409).
  useEffect(() => {
    if (!reasons || !selected) return;
    const current = reasons.find((reason) => reason.code === selected);
    if (!current || !isAvailable(current)) setSelected(null);
  }, [reasons, selected]);

  const loadFailure = loadError ? describeReportError(loadError, 'load') : null;

  // Falhas do carregamento que não viram tela de erro: avisa e fecha (404,
  // 403 de evento que mudou) — a tela não tem o que mostrar.
  useEffect(() => {
    if (!loadFailure || loadFailure.kind !== 'toast') return;
    addToast({ type: loadFailure.tone, message: loadFailure.message });
    if (loadFailure.then === 'close') close();
    // `loadFailure` é derivado de `loadError`; reagir só quando o erro muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadError]);

  const allUnavailable = reasons !== null && reasons.length > 0 && reasons.every((reason) => !isAvailable(reason));
  const isLocked = isSubmitting || allUnavailable;
  const canSubmit = selected !== null && !isLocked && !isOffline && !!target && !!targetId;

  async function handleSubmit() {
    if (!target || !targetId) return;
    if (!selected) {
      setInlineError('Escolha um motivo');
      return;
    }
    setInlineError(null);

    const trimmed = description.trim();
    try {
      const created = await submit({
        report_type: selected,
        ...(trimmed ? { description: trimmed } : null),
        ...(target === 'USER' ? { reported_user_id: targetId } : { reported_event_id: targetId }),
      });
      if (!created) return;
      // Sem protocolo nem prazo: a confirmação não expõe a moderação.
      addToast({ type: 'success', message: 'Denúncia enviada.' });
      close();
    } catch (caught) {
      const failure = describeReportError(caught, 'submit');
      if (failure.kind === 'inline') {
        setInlineError(failure.message);
      } else if (failure.kind === 'toast') {
        addToast({
          type: failure.tone,
          message: failure.message,
          ...(failure.retry ? { actionLabel: 'Tentar de novo', onAction: () => void handleSubmit() } : null),
        });
        if (failure.then === 'close') close();
        if (failure.then === 'reload') void reload();
      }
    }
  }

  const offlineBanner = isOffline ? <OfflineBanner /> : null;

  if (loadFailure?.kind === 'screen' && !isLoading) {
    return (
      <View style={styles.screen}>
        {offlineBanner}
        <View style={styles.errorScreen}>
          <EmptyState
            context="MyEvents"
            title={loadFailure.title}
            text={loadFailure.message}
            cta
            ctaLabel="Tentar de novo"
            onCtaPress={() => void reload()}
          />
        </View>
      </View>
    );
  }

  const showSkeleton = isLoading && reasons === null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {offlineBanner}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.support}>{copy.support}</Text>

        <View style={styles.reasonsSection}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Motivo da denúncia
          </Text>

          {inlineError && (
            <Text style={styles.inlineError} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {inlineError}
            </Text>
          )}

          {showSkeleton ? (
            <View
              accessible
              accessibilityLabel="Carregando motivos"
              accessibilityState={{ busy: true }}
              style={styles.reasons}
            >
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <Skeleton key={index} height={REASON_ROW_HEIGHT - spacing[16]} style={styles.skeletonRow} />
              ))}
            </View>
          ) : (
            <View accessibilityRole="radiogroup" accessibilityLabel="Motivo da denúncia" style={styles.reasons}>
              {(reasons ?? []).map((reason) => (
                <Radio
                  key={reason.code}
                  label={reasonLabel(reason)}
                  selected={selected === reason.code}
                  disabled={!isAvailable(reason) || isSubmitting}
                  onChange={() => {
                    setSelected(reason.code);
                    setInlineError(null);
                  }}
                />
              ))}
            </View>
          )}

          {allUnavailable && (
            <Text style={styles.allUnavailable}>
              Você já tem denúncias em análise para todos os motivos.
            </Text>
          )}
        </View>

        {selected !== null && (
          <TextField
            type="TextArea"
            label="Descrição"
            hint="Opcional"
            placeholder="Conte o que aconteceu"
            value={description}
            onChangeText={setDescription}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            disabled={isSubmitting}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[16] }]}>
        <Button
          label="Enviar denúncia"
          variant="Danger"
          disabled={!canSubmit}
          isLoading={isSubmitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: spacing[16],
  },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[20],
  },
  support: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  reasonsSection: {
    gap: spacing[8],
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  inlineError: {
    ...typography.bodyS,
    color: colors.feedback.error,
  },
  reasons: {
    gap: spacing[4],
  },
  skeletonRow: {
    marginVertical: spacing[8],
  },
  allUnavailable: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  footer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    backgroundColor: colors.bg.base,
  },
  submit: {
    alignSelf: 'stretch',
  },
});
