import type { IconName } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import type { AuditAction } from '@/types/admin';

export type AuditActionIcon = { icon: IconName; color: string };

/**
 * Ícone e cor de cada ação do registro de auditoria. As do frame "Admin —
 * Auditoria de ações" seguem o Figma (banir = lock vermelho, suspender =
 * clock laranja, arquivar denúncia = check cinza, remoção = trash-2
 * vermelho). Reverter e as de tag não aparecem no frame: a escolha é nossa,
 * a validar com design no PR.
 */
export const AUDIT_ACTION_ICONS: Record<AuditAction, AuditActionIcon> = {
  USER_BANNED: { icon: 'lock', color: colors.feedback.error },
  USER_SUSPENDED: { icon: 'clock', color: palette.warning.default },
  USER_REVERTED: { icon: 'circle-check', color: colors.feedback.success },
  REPORT_ARCHIVED: { icon: 'check', color: colors.text.tertiary },
  EVENT_REMOVED: { icon: 'trash-2', color: colors.feedback.error },
  TAG_CREATED: { icon: 'plus', color: colors.text.brand },
  TAG_UPDATED: { icon: 'pencil', color: colors.text.brand },
  TAG_DELETED: { icon: 'trash-2', color: colors.feedback.error },
};

/** Ação que o app ainda não conhece: ícone neutro, sem quebrar a tela. */
export const UNKNOWN_AUDIT_ACTION_ICON: AuditActionIcon = { icon: 'info', color: colors.text.tertiary };
