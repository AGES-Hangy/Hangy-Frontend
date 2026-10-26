import { useCallback, useState } from 'react';

import { endpoints } from '@/constants/api';
import { apiFetch } from '@/utils/http';
import { INVALID_COVER_PHOTO_URL, describeActionError, isApiErrorLike } from '@/utils/apiErrors';

export type UpdateEventBody = {
  title: string;
  description: string | null;
  /**
   * Só quando a capa mudou: `null` remove, e omitido mantém a salva (o backend
   * só atualiza os campos que vieram no corpo).
   */
  cover_photo_url?: string | null;
  tag_ids: string[];
  event_date: string;
  end_date: string;
  /**
   * Os quatro campos de local vão juntos, e só quando o endereço mudou: o
   * backend recalcula o ponto aproximado sempre que `location` vem no corpo.
   */
  location?: { latitude: number; longitude: number };
  location_name?: string | null;
  location_neighborhood?: string | null;
  location_city?: string | null;
};

type UpdateEventResponse = {
  event_id: string;
  title: string;
  event_date: string;
  status: string;
  updated_at: string;
};

/** `invalid-cover` sai sem `saveError`: a tela mostra o erro no campo da capa. */
type SaveEventResult = 'saved' | 'invalid-cover' | 'failed';

/**
 * Edição de evento — `PATCH /events/{event_id}` (`UpdateEventInput` no
 * backend). Não manda `max_participants` nem `privacy`: o contrato não aceita
 * mudar nenhum dos dois depois de criado, só na criação.
 */
export function useEditEvent(eventId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveEvent = useCallback(
    async (body: UpdateEventBody): Promise<SaveEventResult> => {
      if (!eventId) return 'failed';

      setIsSaving(true);
      setSaveError(null);

      try {
        await apiFetch<UpdateEventResponse>(endpoints.event(eventId), {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        return 'saved';
      } catch (caught) {
        if (
          isApiErrorLike(caught) &&
          caught.status === 400 &&
          caught.detail === INVALID_COVER_PHOTO_URL
        ) {
          return 'invalid-cover';
        }
        const failure = describeActionError(caught);
        setSaveError(failure.message || 'Não foi possível salvar as alterações.');
        return 'failed';
      } finally {
        setIsSaving(false);
      }
    },
    [eventId],
  );

  return { saveEvent, isSaving, saveError };
}
