import { useRef } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { DialogProps, DialogVariant } from './types';

const VARIANTS = {
  LeaveEvent: {
    title: 'Sair do evento?',
    description: 'Você deixará de aparecer na lista de confirmados.',
    confirmLabel: 'Cancelar presença',
    destructive: true,
  },
  DeleteEvent: {
    title: 'Excluir evento?',
    description: 'Esta ação não pode ser desfeita. Os participantes serão avisados.',
    confirmLabel: 'Excluir evento',
    destructive: true,
  },
  SendRequest: {
    title: 'Enviar solicitação?',
    description: 'O dono do evento precisa aprovar antes da sua presença ser confirmada.',
    confirmLabel: 'Enviar solicitação',
    destructive: false,
  },
} as const satisfies Record<DialogVariant, unknown>;

export function Dialog({
  visible,
  variant,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel,
  isLoading = false,
}: DialogProps) {
  const variantConfig = VARIANTS[variant];
  const config = {
    ...variantConfig,
    title: title ?? variantConfig.title,
    description: description ?? variantConfig.description,
    confirmLabel: confirmLabel ?? variantConfig.confirmLabel,
  };
  const titleRef = useRef<Text>(null);

  function focusTitle() {
    if (Platform.OS === 'web') return;
    const node = findNodeHandle(titleRef.current);
    if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      onShow={focusTitle}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessible={false}
          importantForAccessibility="no"
        />
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
          <View
            style={styles.card}
            role="dialog"
            accessibilityLabel={config.title}
            accessibilityViewIsModal
            onAccessibilityEscape={onCancel}
          >
            <ScrollView bounces={false} contentContainerStyle={styles.content}>
              <Text ref={titleRef} style={styles.title} accessibilityRole="header">
                {config.title}
              </Text>
              <Text style={styles.description}>{config.description}</Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={onConfirm}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={config.confirmLabel}
                  accessibilityState={{ disabled: isLoading, busy: isLoading }}
                  style={({ pressed }) => [
                    styles.button,
                    styles.confirm,
                    config.destructive && styles.destructive,
                    pressed && !isLoading && styles.pressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.text.inverse} />
                  ) : (
                    <Text style={styles.confirmLabel}>{config.confirmLabel}</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={onCancel}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                  accessibilityState={{ disabled: isLoading }}
                  style={({ pressed }) => [styles.button, pressed && !isLoading && styles.cancelPressed]}
                >
                  <Text style={styles.cancelLabel}>Voltar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.inverse,
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[24],
  },
  card: {
    width: 340,
    maxWidth: '100%',
    maxHeight: '100%',
    flexShrink: 1,
    backgroundColor: colors.surface.card,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  content: { padding: spacing[24] },
  title: { ...typography.h3, color: colors.text.primary },
  description: {
    ...typography.bodyM,
    color: colors.text.secondary,
    marginTop: spacing[8],
  },
  actions: { marginTop: spacing[24], gap: spacing[4] },
  button: {
    minHeight: spacing[48],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: { backgroundColor: colors.action.primary },
  destructive: { backgroundColor: colors.action.danger },
  pressed: { opacity: 0.85 },
  cancelPressed: { backgroundColor: colors.surface.sunken },
  confirmLabel: { ...typography.labelL, color: colors.text.inverse, textAlign: 'center' },
  cancelLabel: { ...typography.labelL, color: colors.text.secondary, textAlign: 'center' },
});

export type { DialogProps, DialogVariant } from './types';
