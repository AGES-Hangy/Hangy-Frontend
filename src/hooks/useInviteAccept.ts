import { useState } from 'react';

import { ApiError, apiFetch } from '@/utils/http';

export type InviteAcceptResult = {
  participant_id: string;
  event_id: string;
  status: 'CONFIRMED';
  updated_at: string;
};

/**
 * Falha ao aceitar o convite. É o `ApiError` do `apiFetch`: o 401 já foi
 * tratado pelo interceptor global (toast + Login).
 */
export type InviteAcceptError = ApiError;

export function useInviteAccept() {
  const [isAccepting, setIsAccepting] = useState(false);

  async function accept(token: string): Promise<InviteAcceptResult> {
    setIsAccepting(true);
    try {
      return await apiFetch<InviteAcceptResult>(`/invites/${token}/accept`, { method: 'POST' });
    } finally {
      setIsAccepting(false);
    }
  }

  return { accept, isAccepting };
}
