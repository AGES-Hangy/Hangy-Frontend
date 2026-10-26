import { useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { getToken } from '@/utils/auth';

type ParticipationResult = {
  participant_id: string;
  status: 'CONFIRMED' | 'PENDING';
  joined_at: string;
};

export type ParticipationError = { status: number; detail?: string };

async function authHeaders() {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

export function useParticipation(eventId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function join(): Promise<ParticipationResult> {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/participation`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw { status: response.status, detail: json.detail } as ParticipationError;
      return json as ParticipationResult;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancel(): Promise<void> {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/participation`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw { status: response.status, detail: json.detail } as ParticipationError;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { join, cancel, isSubmitting };
}