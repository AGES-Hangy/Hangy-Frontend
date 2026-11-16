/**
 * Contratos da denúncia — cópia do que as tasks de backend 089, 239 e 296
 * entregam. Se algo divergir, o backend é a fonte de verdade.
 */

/** Quem está sendo denunciado. Estabelecimento é um `USER`. */
export type ReportTarget = 'USER' | 'EVENT';

/** `ReportTypeEnum` do backend. */
export type ReportReasonCode =
  | 'SPAM'
  | 'HARASSMENT'
  | 'INAPPROPRIATE_CONTENT'
  | 'FAKE_PROFILE'
  | 'HATE_SPEECH'
  | 'MISLEADING_EVENT'
  | 'SAFETY_CONCERN'
  | 'OTHER';

/**
 * Por que um motivo não pode ser escolhido agora: já existe uma denúncia
 * aberta por ele, ou ele é só para quem participou do evento.
 */
export type ReportUnavailableReason = 'ALREADY_REPORTED' | 'PARTICIPANTS_ONLY';

/** Item de `GET /reports/reasons`. */
export interface ReportReason {
  code: ReportReasonCode;
  label: string;
  scope?: 'CONTENT' | 'EXPERIENCE';
  /**
   * Ausente enquanto o backend não entrega a task 296 — tratar como
   * disponível, que é o que a API sem a regra aceita.
   */
  available?: boolean;
  unavailable_reason?: ReportUnavailableReason | null;
}

/** Corpo de `POST /reports`: exatamente um dos dois alvos. */
export type ReportCreateInput = {
  report_type: ReportReasonCode;
  description?: string;
} & ({ reported_user_id: string } | { reported_event_id: string });

/** Resposta `201` de `POST /reports`. O autor nunca vem. */
export interface ReportCreated {
  report_id: string;
  report_type: ReportReasonCode;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  created_at: string;
}

/** Limite de `description` no backend (`REPORT_DESCRIPTION_MAX_LENGTH`). */
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
