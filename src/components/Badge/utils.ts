import type { PrivacyBadgeValue, StatusBadgeValue } from './types';

export type BackendPrivacy = 'Publico' | 'Privado' | 'PorConvite';
export type BackendStatus = 'Confirmed' | 'Pending' | 'Rejected' | 'Full' | 'Default';

const privacyMap: Record<BackendPrivacy, { label: string; value: PrivacyBadgeValue }> = {
  Publico: { label: 'Público', value: 'Público' },
  Privado: { label: 'Privado', value: 'Privado' },
  PorConvite: { label: 'Por convite', value: 'Por convite' },
};

const statusMap: Record<Exclude<BackendStatus, 'Default'>, StatusBadgeValue> = {
  Confirmed: 'Confirmado',
  Pending: 'Pendente',
  Rejected: 'Recusado',
  Full: 'Lotado',
};

export function getPrivacyBadgeValue(privacy: BackendPrivacy): PrivacyBadgeValue {
  return privacyMap[privacy].value;
}

export function getPrivacyBadgeLabel(privacy: BackendPrivacy): string {
  return privacyMap[privacy].label;
}

export function getStatusBadgeValue(status?: BackendStatus): StatusBadgeValue | null {
  return status && status !== 'Default' ? statusMap[status] : null;
}