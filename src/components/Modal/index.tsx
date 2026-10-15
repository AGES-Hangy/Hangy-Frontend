import type { ReactNode } from 'react';
import { Modal as NativeModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export type ModalProps = {
  visible: boolean;
  title: string;
  /** Fechar pelo ×, pelo scrim ou pelo voltar do Android: descarta o que o modal tinha. */
  onClose: () => void;
  /** Slot do conteúdo, entre o título e o botão. Rola quando não cabe. */
  children?: ReactNode;
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
};

/**
 * Modal de conteúdo (título, fechar, slot e botão) — Modal da Sprint 3
 * Components. Para confirmações curtas use o `Dialog`.
 *
 * ```tsx
 * <Modal visible={open} title="Adicionar áreas" onClose={close} primaryLabel="Continuar" onPrimaryPress={next}>
 *   ...
 * </Modal>
 * ```
 */
export function Modal({
  visible,
  title,
  onClose,
  children,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
}: ModalProps) {
  return (
    <NativeModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no"
        />
        <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
          <View
            style={styles.card}
            role="dialog"
            accessibilityLabel={title}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="x" size="SM" variant="Ghost" accessibilityLabel="Fechar" onPress={onClose} />
            </View>

            <ScrollView
              bounces={false}
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            <Button
              label={primaryLabel}
              onPress={onPrimaryPress}
              disabled={primaryDisabled}
              style={styles.primary}
            />
          </View>
        </SafeAreaView>
      </View>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg.inverse,
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[16],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
    flexShrink: 1,
    padding: spacing[20],
    gap: spacing[16],
    backgroundColor: colors.surface.card,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  title: {
    ...typography.h3,
    flex: 1,
    color: colors.text.primary,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: spacing[16],
  },
  primary: {
    alignSelf: 'stretch',
  },
});
