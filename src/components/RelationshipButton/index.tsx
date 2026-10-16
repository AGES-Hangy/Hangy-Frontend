import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import type { ButtonVariant } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { RelationshipButtonProps } from './types';

export type { RelationshipButtonProps } from './types';

function resolveAppearance({
  userType,
  connectionStatus,
  isFollowing,
}: Pick<RelationshipButtonProps, 'userType' | 'connectionStatus' | 'isFollowing'>): {
  label: string;
  variant: ButtonVariant;
} {
  if (userType === 'BUSINESS') {
    return isFollowing
      ? { label: 'Seguindo', variant: 'Tertiary' }
      : { label: 'Seguir', variant: 'Primary' };
  }

  if (connectionStatus === 'PENDING') return { label: 'Solicitação enviada', variant: 'Secondary' };
  if (connectionStatus === 'CONFIRMED') return { label: 'Conectados', variant: 'Tertiary' };
  return { label: 'Conectar', variant: 'Primary' };
}

export function RelationshipButton({
  userType,
  connectionStatus,
  connectionDirection,
  isFollowing,
  onPress,
  onAnswer,
  requestText,
  accessibilityLabel,
  disabled = false,
  isLoading = false,
  style,
  ref,
}: RelationshipButtonProps) {
  // Solicitação recebida: o par do `NotificationItem`, na mesma ordem e com os mesmos rótulos visíveis.
  if (userType === 'PERSONAL' && connectionStatus === 'PENDING' && connectionDirection === 'RECEIVED') {
    const answerDisabled = disabled || !onAnswer;
    return (
      <View style={[styles.received, style]}>
        {requestText && <Text style={styles.requestText}>{requestText}</Text>}
        <View style={styles.answers}>
          <Button
            label="Recusar"
            variant="Secondary"
            size="LG"
            onPress={() => onAnswer?.('REJECTED')}
            accessibilityLabel="Recusar solicitação de conexão"
            disabled={answerDisabled}
            style={styles.answer}
          />
          <Button
            ref={ref}
            label="Confirmar"
            variant="Primary"
            size="LG"
            onPress={() => onAnswer?.('CONFIRMED')}
            accessibilityLabel="Confirmar solicitação de conexão"
            disabled={answerDisabled}
            isLoading={isLoading}
            style={styles.answer}
          />
        </View>
      </View>
    );
  }

  const { label, variant } = resolveAppearance({ userType, connectionStatus, isFollowing });

  return (
    <Button
      ref={ref}
      label={label}
      variant={variant}
      size="LG"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      isLoading={isLoading}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  received: {
    gap: spacing[8],
  },
  requestText: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  answers: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  answer: {
    flex: 1,
  },
});
