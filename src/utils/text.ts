/** Sem acento e minúsculo — pra filtrar Estado/Cidade digitando sem acento. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
