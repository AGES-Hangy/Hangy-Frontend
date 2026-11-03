import type { IconName } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';

export type BadgeFamily = 'Privacy' | 'Status' | 'Moderation' | 'Notification';

export type PrivacyBadgeValue =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'INVITE_ONLY';

export type StatusBadgeValue =
  | 'CONFIRMED'
  | 'PENDING'
  | 'REJECTED'
  | 'FULL'
  | 'Confirmado'
  | 'Pendente'
  | 'Recusado'
  | 'Lotado';

/**
 * Estado de moderação de uma conta (`ACTIVE`, `SUSPENDED`, `BANNED`) ou de uma
 * denúncia (`ReportStatusEnum` do backend: `PENDING`, `REVIEWED`, `RESOLVED`, `REJECTED`).
 */
export type ModerationBadgeValue =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'PENDING'
  | 'REVIEWED'
  | 'RESOLVED'
  | 'REJECTED';

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
      family: 'Moderation';
      /**
       * Aceita qualquer string para não quebrar a tela com um status novo do
       * backend que o app ainda não mapeia — nesse caso cai no fallback neutro.
       */
      value: ModerationBadgeValue | (string & {});
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
  PRIVATE: {
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

const neutralColors = {
  textColor: palette.neutral[500],
  backgroundColor: palette.neutral[50],
  borderColor: palette.neutral[300],
} as const;

const moderationVariantMap: Record<ModerationBadgeValue, BadgeVisualConfig> = {
  ACTIVE: {
    label: 'Ativo',
    icon: 'circle-check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  SUSPENDED: {
    label: 'Suspenso',
    icon: 'triangle-alert',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  BANNED: {
    label: 'Banido',
    icon: 'lock',
    textColor: palette.error.default,
    backgroundColor: palette.error.bg,
    borderColor: palette.error.default,
  },
  PENDING: {
    label: 'Pendente',
    icon: 'clock',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  REVIEWED: {
    label: 'Em análise',
    icon: 'clock',
    textColor: palette.info.default,
    backgroundColor: palette.info.bg,
    borderColor: palette.info.default,
  },
  RESOLVED: {
    label: 'Resolvido',
    icon: 'check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  REJECTED: {
    label: 'Arquivada',
    icon: 'x',
    ...neutralColors,
  },
};

const moderationFallbackVariant: BadgeVisualConfig = {
  label: 'Indefinido',
  icon: 'info',
  ...neutralColors,
};

function isKnownModerationValue(value: string): value is ModerationBadgeValue {
  return Object.prototype.hasOwnProperty.call(moderationVariantMap, value);
}

export function resolvePrivacyVariant(value: PrivacyBadgeValue): BadgeVisualConfig {
  return privacyVariantMap[value];
}

export function resolveStatusVariant(value: StatusBadgeValue): BadgeVisualConfig {
  return statusVariantMap[value];
}

export function resolveModerationVariant(value: string): BadgeVisualConfig {
  return isKnownModerationValue(value) ? moderationVariantMap[value] : moderationFallbackVariant;
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
export const moderationBadgeValues = Object.keys(moderationVariantMap) as ModerationBadgeValue[];
