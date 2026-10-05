import { Button } from '@/components/Button';
import type { ButtonVariant } from '@/components/Button';

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
  isFollowing,
  onPress,
  disabled = false,
  style,
}: RelationshipButtonProps) {
  const { label, variant } = resolveAppearance({ userType, connectionStatus, isFollowing });

  return (
    <Button
      label={label}
      variant={variant}
      size="LG"
      onPress={onPress}
      disabled={disabled}
      style={style}
    />
  );
}
