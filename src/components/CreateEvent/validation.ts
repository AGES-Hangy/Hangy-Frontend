import type { CreateEventFormData, MissingField } from '@/components/CreateEvent/types';

/**
 * Campos obrigatórios da etapa 1 ainda pendentes, na ordem em que aparecem na
 * tela.
 */
export function validateStep1(form: CreateEventFormData): MissingField[] {
  const missing: MissingField[] = [];
  if (form.title.trim().length === 0) missing.push('title');
  if (form.tagIds.length === 0) missing.push('tags');
  return missing;
}
