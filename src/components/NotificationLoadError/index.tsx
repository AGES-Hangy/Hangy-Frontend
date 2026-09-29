import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

type NotificationLoadErrorProps = {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function NotificationLoadError({ message, onRetry, compact = false }: NotificationLoadErrorProps) {
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {!compact && (
        <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
          <Icon name="circle-alert" size={layout.notificationItem.fallbackIconSize} color={colors.feedback.error} />
        </View>
      )}
      <View style={[styles.copy, compact && styles.compactCopy]}>
        <Text style={styles.title} accessibilityRole={compact ? undefined : 'header'}>
          {compact ? 'Não foi possível atualizar' : 'Não foi possível carregar'}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {onRetry && (
        <Button
          label="Tentar de novo"
          accessibilityLabel="Tentar carregar notificações novamente"
          variant={compact ? 'Tertiary' : 'Primary'}
          size="MD"
          onPress={onRetry}
          style={compact ? styles.compactRetryButton : styles.retryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[32],
  },
  compactContainer: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
    padding: spacing[12],
    borderRadius: radius.md,
    backgroundColor: palette.error.bg,
  },
  copy: {
    alignItems: 'center',
    gap: spacing[8],
  },
  compactCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  illustration: {
    width: layout.emptyState.illustrationSize,
    height: layout.emptyState.illustrationSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.error.bg,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyM,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[8],
  },
  compactRetryButton: {
    marginTop: 0,
  },
});
