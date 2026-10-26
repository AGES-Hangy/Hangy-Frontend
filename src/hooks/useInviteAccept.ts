import { useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';

export type InviteAcceptResult = {
  participant_id: string;
  event_id: string;
  status: 'CONFIRMED';
  updated_at: string;
};

export type InviteAcceptError = { status: number; detail?: string };

export function useInviteAccept() {
  const [isAccepting, setIsAccepting] = useState(false);

  async function accept(token: string): Promise<InviteAcceptResult> {
    setIsAccepting(true);
    try {
      const authToken = await getToken();
      const response = await fetch(`${API_BASE_URL}/invites/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw { status: response.status, detail: json.detail } as InviteAcceptError;
      return json as InviteAcceptResult;
    } finally {
      setIsAccepting(false);
    }
  }

  return { accept, isAccepting };
}