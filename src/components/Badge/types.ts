import type { IconName } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';

export type BadgeFamily = 'Privacy' | 'Status' | 'Notification';

export type PrivacyBadgeValue =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'INVITE_ONLY'
  | 'Público'
  | 'Privado'
  | 'Por convite';

export type StatusBadgeValue =
  | 'CONFIRMED'
  | 'PENDING'
  | 'REJECTED'
  | 'FULL'
  | 'Confirmado'
  | 'Pendente'
  | 'Recusado'
  | 'Lotado';

export type NotificationBadgeCount = number | undefined;

export type BadgeProps =
  | {
      family: 'Privacy';
      value: PrivacyBadgeValue;
      count?: never;
    }
  | {
      family: 'Status';
      value: StatusBadgeValue;
      count?: never;
    }
  | {
      family: 'Notification';
      value?: never;
      count?: NotificationBadgeCount;
    };

export type BadgeVisualConfig = {
  label: string;
  icon: IconName;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
};

const privacyVariantMap: Record<PrivacyBadgeValue, BadgeVisualConfig> = {
  PUBLIC: {
    label: 'Público',
    icon: 'users',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  'Público': {
    label: 'Público',
    icon: 'users',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  PRIVATE: {
    label: 'Privado',
    icon: 'lock',
    textColor: palette.primary[600],
    backgroundColor: palette.primary[100],
    borderColor: palette.primary[600],
  },
  Privado: {
    label: 'Privado',
    icon: 'lock',
    textColor: palette.primary[600],
    backgroundColor: palette.primary[100],
    borderColor: palette.primary[600],
  },
  INVITE_ONLY: {
    label: 'Por convite',
    icon: 'ticket',
    textColor: palette.secondary[700],
    backgroundColor: palette.secondary[50],
    borderColor: palette.secondary[700],
  },
  'Por convite': {
    label: 'Por convite',
    icon: 'ticket',
    textColor: palette.secondary[700],
    backgroundColor: palette.secondary[50],
    borderColor: palette.secondary[700],
  },
};

const statusVariantMap: Record<StatusBadgeValue, BadgeVisualConfig> = {
  CONFIRMED: {
    label: 'Confirmado',
    icon: 'check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  Confirmado: {
    label: 'Confirmado',
    icon: 'check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  PENDING: {
    label: 'Pendente',
    icon: 'clock',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  Pendente: {
    label: 'Pendente',
    icon: 'clock',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  REJECTED: {
    label: 'Recusado',
    icon: 'x',
    textColor: palette.error.default,
    backgroundColor: palette.error.bg,
    borderColor: palette.error.default,
  },
  Recusado: {
    label: 'Recusado',
    icon: 'x',
    textColor: palette.error.default,
    backgroundColor: palette.error.bg,
    borderColor: palette.error.default,
  },
  FULL: {
    label: 'Lotado',
    icon: 'users',
    textColor: palette.neutral[500],
    backgroundColor: palette.neutral[50],
    borderColor: palette.neutral[300],
  },
  Lotado: {
    label: 'Lotado',
    icon: 'users',
    textColor: palette.neutral[500],
    backgroundColor: palette.neutral[50],
    borderColor: palette.neutral[300],
  },
};

export function resolvePrivacyVariant(value: PrivacyBadgeValue): BadgeVisualConfig {
  return privacyVariantMap[value];
}

export function resolveStatusVariant(value: StatusBadgeValue): BadgeVisualConfig {
  return statusVariantMap[value];
}

export function resolveNotificationCount(count?: number): { type: 'dot' | 'count'; value: string } | null {
  if (count === undefined || typeof count !== 'number' || Number.isNaN(count) || count <= 0) {
    return null;
  }

  if (count === 1) {
    return { type: 'dot', value: '' };
  }

  if (count > 9) {
    return { type: 'count', value: '9+' };
  }

  return { type: 'count', value: `${count}` };
}

export const privacyBadgeValues = Object.keys(privacyVariantMap) as PrivacyBadgeValue[];
export const statusBadgeValues = Object.keys(statusVariantMap) as StatusBadgeValue[];
