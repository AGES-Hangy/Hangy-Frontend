import type { IconName } from '@/components/Icon';
import { palette } from '@/constants/colors';

/** Valores do COMPONENT_SET Badge/Moderation do Figma (+ `Arquivada`) */
export type BadgeModerationValue =
  | 'Ativo'
  | 'Suspenso'
  | 'Banido'
  | 'Pendente'
  | 'EmAnalise'
  | 'Resolvida'
  | 'Arquivada';

export type BadgeModerationProps = {
  /**
   * Aceita qualquer string para não quebrar a tela com um status novo do
   * backend que o app ainda não mapeia — nesse caso cai no fallback neutro.
   */
  value: BadgeModerationValue | (string & {});
};

export type BadgeModerationVisualConfig = {
  label: string;
  icon: IconName;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
};

const neutralColors = {
  textColor: palette.neutral[500],
  backgroundColor: palette.neutral[50],
  borderColor: palette.neutral[300],
} as const;

const moderationVariantMap: Record<BadgeModerationValue, BadgeModerationVisualConfig> = {
  Ativo: {
    label: 'Ativo',
    icon: 'circle-check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  Suspenso: {
    label: 'Suspenso',
    icon: 'triangle-alert',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  Banido: {
    label: 'Banido',
    icon: 'lock',
    textColor: palette.error.default,
    backgroundColor: palette.error.bg,
    borderColor: palette.error.default,
  },
  Pendente: {
    label: 'Pendente',
    icon: 'clock',
    textColor: palette.warning.default,
    backgroundColor: palette.warning.bg,
    borderColor: palette.warning.default,
  },
  EmAnalise: {
    label: 'Em análise',
    icon: 'clock',
    textColor: palette.info.default,
    backgroundColor: palette.info.bg,
    borderColor: palette.info.default,
  },
  Resolvida: {
    label: 'Resolvida',
    icon: 'check',
    textColor: palette.success.default,
    backgroundColor: palette.success.bg,
    borderColor: palette.success.default,
  },
  Arquivada: {
    label: 'Arquivada',
    icon: 'x',
    ...neutralColors,
  },
};

const fallbackVariant: BadgeModerationVisualConfig = {
  label: 'Indefinido',
  icon: 'info',
  ...neutralColors,
};

function isKnownModerationValue(value: string): value is BadgeModerationValue {
  return Object.prototype.hasOwnProperty.call(moderationVariantMap, value);
}

export function resolveModerationVariant(value: string): BadgeModerationVisualConfig {
  return isKnownModerationValue(value) ? moderationVariantMap[value] : fallbackVariant;
}

export const badgeModerationValues = Object.keys(moderationVariantMap) as BadgeModerationValue[];
