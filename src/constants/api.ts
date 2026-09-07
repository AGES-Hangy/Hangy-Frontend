export const API_BASE_URL = 'http://localhost:8000';

/**
 * Liga as respostas de mentira de `src/mocks/eventApi.ts` no lugar da rede.
 *
 * Existe porque os endpoints de evento (tasks de backend 103, 097, 209 e 099)
 * ainda não foram mergeados: com isto em `true` dá para percorrer as telas de
 * ponta a ponta, e quando o backend subir é só virar para `false` — nenhum
 * hook ou tela muda, o desvio acontece dentro de `apiFetch`.
 *
 * Só vale em desenvolvimento: num build de produção o mock nunca entra, mesmo
 * se alguém esquecer esta constante ligada.
 */
export const USE_API_MOCKS = __DEV__ && true;

/** Quanto esperar por uma resposta antes de desistir. */
export const API_TIMEOUT_MS = 15000;

/** Rotas da API de eventos. */
export const endpoints = {
  event: (eventId: string) => `/events/${eventId}`,
  eventParticipants: (eventId: string) => `/events/${eventId}/participants`,
  eventCancel: (eventId: string) => `/events/${eventId}/cancel`,
  eventParticipant: (eventId: string, participantId: string) =>
    `/events/${eventId}/participants/${participantId}`,
  myCreatedEvents: () => '/users/me/events/created',
} as const;
