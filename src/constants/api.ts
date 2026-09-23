export const API_BASE_URL = 'http://localhost:8000';

/**
 * Liga as respostas de mentira de `src/mocks/eventApi.ts` no lugar da rede.
 *
 * Existe porque os endpoints de evento (tasks de backend 103, 097, 209, 099 e
 * 101) ainda não foram mergeados: com isto ligado dá para percorrer as telas de
 * ponta a ponta, e quando o backend subir é só parar de usar a flag — nenhum
 * hook ou tela muda, o desvio acontece dentro de `apiFetch`.
 *
 * Controlado por `EXPO_PUBLIC_USE_API_MOCKS`, setada pelo script
 * `npm run start:stub` (o `npm start` normal roda contra a API de verdade).
 *
 * Só vale em desenvolvimento: num build de produção o mock nunca entra, mesmo
 * se alguém esquecer a env var ligada.
 */
export const USE_API_MOCKS = __DEV__ && process.env.EXPO_PUBLIC_USE_API_MOCKS === 'true';

/** Quanto esperar por uma resposta antes de desistir. */
export const API_TIMEOUT_MS = 15000;

/** Maior `limit` aceito por `GET /participants` — a tela não pagina, então pede a página cheia. */
const PARTICIPANTS_PAGE_LIMIT = 100;

/** Rotas da API de eventos. */
export const endpoints = {
  login: () => '/auth/login',
  event: (eventId: string) => `/events/${eventId}`,
  /** Sem `status`, a API devolve confirmados; `status=PENDING` exige ser o organizador. */
  eventParticipants: (eventId: string, status?: 'PENDING') => {
    const params = new URLSearchParams({ limit: String(PARTICIPANTS_PAGE_LIMIT) });
    if (status) params.set('status', status);
    return `/events/${eventId}/participants?${params.toString()}`;
  },
  eventCancel: (eventId: string) => `/events/${eventId}/cancel`,
  eventShare: (eventId: string) => `/events/${eventId}/share`,
  eventParticipant: (eventId: string, participantId: string) =>
    `/events/${eventId}/participants/${participantId}`,
  myCreatedEvents: () => '/users/me/events/created',
} as const;
