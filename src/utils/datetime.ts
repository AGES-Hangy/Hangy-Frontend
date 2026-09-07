/**
 * Formatação de data e hora das telas de evento.
 *
 * Tudo é feito na mão, sem `Intl`: o Hermes só traz o ICU completo em builds
 * específicos, e num aparelho sem ele `toLocaleDateString('pt-BR')` cai em
 * inglês silenciosamente. Estes formatos são os do Figma e não mudam por
 * idioma, então não vale arrastar uma biblioteca de datas para o app.
 */

const doisDigitos = (valor: number) => String(valor).padStart(2, '0');

/** `2026-10-30T16:00:00Z` -> `30/10/2026` */
export function formatDate(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';

  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

/** `2026-10-30T16:00:00Z` -> `16:00` */
export function formatTime(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';

  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** `30/10/2026 · 16:00` — a linha de data do card de informações. */
export function formatDateTime(iso: string): string {
  const data = formatDate(iso);
  return data ? `${data} · ${formatTime(iso)}` : '';
}

/** `30/10/2026 · 16:00 · Parque Esportivo` — o subtítulo do `EventCard`. */
export function formatEventSummary(iso: string, locationName: string): string {
  return [formatDateTime(iso), locationName].filter(Boolean).join(' · ');
}

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * `há 2 h`, `há 5 min`, `há 3 d` — o tempo desde a solicitação, como no
 * "pediu para participar · há 2 h" do Figma.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';

  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';

  const decorrido = Date.now() - data.getTime();
  if (decorrido < MINUTO) return 'agora';
  if (decorrido < HORA) return `há ${Math.floor(decorrido / MINUTO)} min`;
  if (decorrido < DIA) return `há ${Math.floor(decorrido / HORA)} h`;

  return `há ${Math.floor(decorrido / DIA)} d`;
}
