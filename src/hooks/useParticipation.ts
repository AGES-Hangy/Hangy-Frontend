import { useState } from 'react';

import { ApiError, apiFetch } from '@/utils/http';

type ParticipationResult = {
  participant_id: string;
  status: 'CONFIRMED' | 'PENDING';
  joined_at: string;
};

/**
 * Falha de participar/cancelar. É o `ApiError` do `apiFetch`: o 401 já foi
 * tratado pelo interceptor global (toast + Login), e `status` é `null` quando
 * a requisição nem chegou ao servidor (sem rede, timeout).
 */
export type ParticipationError = ApiError;

export function useParticipation(eventId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function join(): Promise<ParticipationResult> {
    setIsSubmitting(true);
    try {
      return await apiFetch<ParticipationResult>(`/events/${eventId}/participation`, { method: 'POST' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancel(): Promise<void> {
    setIsSubmitting(true);
    try {
      await apiFetch<void>(`/events/${eventId}/participation`, { method: 'DELETE' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return { join, cancel, isSubmitting };
}
