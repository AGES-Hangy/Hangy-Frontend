import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { ErrorScreenProps, ErrorScreenTone } from './types';

const TONES: Record<ErrorScreenTone, { background: string; icon: string }> = {
  error: { background: palette.error.bg, icon: palette.error.default },
  warning: { background: palette.warning.bg, icon: palette.warning.default },
  neutral: { background: palette.primary[100], icon: colors.action.primary },
};

/**
 * Tela cheia de erro (task 141) — frames `Erro do servidor` e `Sem conexão`.
 *
 * Genérica de propósito: título, texto, ícone e ação vêm de quem usa. Para
 * transformar um `LoadError` dos hooks nestas props, use `loadErrorScreenProps`
 * de `@/utils/errorScreen`. Não substitui o `OfflineBanner`: a faixa continua
 * sendo o aviso de rede quando há conteúdo na tela; esta só aparece quando a
 * primeira carga falhou e não há nada para mostrar.
 */
export function ErrorScreen({
  title,
  message,
  icon = 'circle-alert',
  tone = 'error',
  action,
  footer,
  withBottomInset = false,
  style,
}: ErrorScreenProps) {
  const toneColors = TONES[tone];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.screen, withBottomInset && { paddingBottom: spacing[16] + insets.bottom }, style]}
    >
      <View style={styles.message} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View
          style={[styles.illustration, { backgroundColor: toneColors.background }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Icon name={icon} size={layout.emptyState.illustrationIconSize} color={toneColors.icon} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.text}>{message}</Text>
      </View>

      {(action || footer) && (
        <View style={styles.footer}>
          {action && (
            <Button
              label={action.label}
              accessibilityLabel={action.accessibilityLabel}
              size="LG"
              onPress={action.onPress}
              isLoading={action.isLoading}
              disabled={action.disabled}
              style={styles.fullWidth}
            />
          )}
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
    paddingHorizontal: spacing[16],
    // 32 entre o botão e a BottomNav, como nos frames.
    paddingBottom: spacing[32],
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[16],
    // 393 de frame − 329 de bloco de texto = 32 de cada lado; o 16 da tela já está no `screen`.
    paddingHorizontal: spacing[16],
  },
  illustration: {
    width: layout.emptyState.illustrationSize,
    height: layout.emptyState.illustrationSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  text: {
    ...typography.bodyM,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    gap: spacing[8],
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});

export type { ErrorScreenAction, ErrorScreenProps, ErrorScreenTone } from './types';
