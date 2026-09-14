import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';
import { describeActionError } from '@/utils/apiErrors';

export type UpdateEventBody = {
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  tag_ids: string[];
  event_date: string;
  end_date: string;
  location: { latitude: number; longitude: number };
  location_name: string | null;
};

type UpdateEventResponse = {
  event_id: string;
  title: string;
  event_date: string;
  status: string;
  updated_at: string;
};

/**
 * Edição de evento — `PATCH /events/{event_id}` (`UpdateEventInput` no
 * backend). Não manda `max_participants` nem `privacy`: o contrato não aceita
 * mudar nenhum dos dois depois de criado, só na criação.
 */
export function useEditEvent(eventId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveEvent = useCallback(
    async (body: UpdateEventBody): Promise<boolean> => {
      if (!eventId) return false;

      setIsSaving(true);
      setSaveError(null);

      try {
        await apiFetch<UpdateEventResponse>(endpoints.event(eventId), {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        return true;
      } catch (caught) {
        const failure = describeActionError(caught);
        setSaveError(failure.message || 'Não foi possível salvar as alterações.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [eventId],
  );

  return { saveEvent, isSaving, saveError };
}
