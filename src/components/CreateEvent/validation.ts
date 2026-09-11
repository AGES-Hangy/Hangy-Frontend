import type { CreateEventFormData, MissingField } from '@/components/CreateEvent/types';

/**
 * Campos obrigatórios da etapa 1 ainda pendentes, na ordem em que aparecem na
 * tela. Função pura de propósito: dá para testar sem montar a tela, e a etapa 2
 * acrescenta o seu `validateStep2` aqui do lado em vez de empilhar `if`s no
 * container.
 */
export function validateStep1(form: CreateEventFormData): MissingField[] {
  const missing: MissingField[] = [];
  if (form.title.trim().length === 0) missing.push('title');
  if (form.tagIds.length === 0) missing.push('tags');
  return missing;
}
