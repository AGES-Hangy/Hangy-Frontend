import type { UserEventsTab } from '@/types/user';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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

/**
 * Envio de arquivo (`apiUpload`): sem nenhum progresso de envio por este tempo,
 * desiste. Só vale depois do primeiro evento de progresso com total conhecido —
 * se a plataforma não dispara o evento, um envio lento mas saudável seria abortado.
 */
export const UPLOAD_STALL_TIMEOUT_MS = 30000;

/**
 * Envio de arquivo: espera pela resposta depois do último byte (e até o primeiro
 * progresso). Cobre o pior caso do backend gravando no S3, ~105 s com as
 * tentativas do boto; com menos, o app culparia a conexão por um 503 a caminho.
 */
export const UPLOAD_RESPONSE_TIMEOUT_MS = 120000;

/** Maior `limit` aceito por `GET /participants` — a tela não pagina, então pede a página cheia. */
const PARTICIPANTS_PAGE_LIMIT = 100;

/** Rotas da API de eventos. */
export const endpoints = {
  login: () => '/auth/login',
  passwordResetRequest: () => '/auth/password-reset/request',
  passwordResetVerify: () => '/auth/password-reset/verify',
  passwordResetConfirm: () => '/auth/password-reset/confirm',
  register: () => '/auth/register',
  termsCurrent: () => '/terms/current',
  me: () => '/users/me',
  userTags: () => '/users/me/tags',
  /** Perfil de pessoa física: `GET` (leitura para a edição) e `PATCH` (task 071 [BE]). */
  userProfile: () => '/users/me/profile',
  /** Perfil de estabelecimento: `GET` (task 077 [BE]) e `PATCH` (task 229 [BE]). */
  businessProfile: () => '/businesses/me',
  /**
   * Exclusão de conta. Ainda sem task de backend: `DELETE /users/me`, com a
   * senha atual no corpo, é o contrato proposto — confirmar quando a task existir.
   */
  account: () => '/users/me',
  event: (eventId: string) => `/events/${eventId}`,
  /** Registro do participante num evento encerrado (task 073 [BE]). */
  eventExperiences: (eventId: string) => `/events/${eventId}/experiences`,
  /** Envio do arquivo de uma foto, em `multipart/form-data` (task 225 [BE]). */
  experienceImages: (experienceId: string) => `/experiences/${experienceId}/images`,
  /** Remoção de uma foto — só o autor ou o organizador (task 226 [BE]). */
  experienceImage: (photoId: string) => `/experiences/images/${photoId}`,
  /**
   * Eventos ao redor de um ponto (task 119). A coordenada é o centro do mapa e
   * só existe nesta query — a posição do usuário não é persistida no backend.
   */
  eventsNearby: ({ latitude, longitude, radiusM }: { latitude: number; longitude: number; radiusM: number }) => {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      radius_m: String(Math.round(radiusM)),
    });
    return `/events/nearby?${params.toString()}`;
  },
  /** Sem `status`, a API devolve confirmados; `status=PENDING` exige ser o organizador. */
  eventParticipants: (eventId: string, status?: 'PENDING') => {
    const params = new URLSearchParams({ limit: String(PARTICIPANTS_PAGE_LIMIT) });
    if (status) params.set('status', status);
    return `/events/${eventId}/participants?${params.toString()}`;
  },
  eventCancel: (eventId: string) => `/events/${eventId}/cancel`,
  eventShare: (eventId: string) => `/events/${eventId}/share`,
  eventFavorite: (eventId: string) => `/events/${encodeURIComponent(eventId)}/favorite`,
  notifications: (options?: { limit?: number; cursor?: string | null; unreadOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.unreadOnly) params.set('unread_only', 'true');
    const query = params.toString();
    return `/notifications${query ? `?${query}` : ''}`;
  },
  notificationRead: (notificationId: string) =>
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  notificationsReadAll: () => '/notifications/read-all',
  notificationsUnreadCount: () => '/notifications/unread-count',
  eventParticipant: (eventId: string, participantId: string) =>
    `/events/${eventId}/participants/${participantId}`,
  myCreatedEvents: () => '/users/me/events/created',
  /** Capa do evento: `multipart/form-data` com o campo `file` (task 276 [BE]). */
  eventCovers: () => '/uploads/event-covers',
  user: (userId: string) => `/users/${encodeURIComponent(userId)}`,
  /** Sem tab, vem a primeira página de cada aba permitida. */
  userEvents: (
    userId: string,
    options?: { limit?: number } | { tab: UserEventsTab; cursor: string; limit?: number },
  ) => {
    const params = new URLSearchParams();
    if (options && 'tab' in options) {
      params.set('tab', options.tab);
      params.set('cursor', options.cursor);
    }
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    const query = params.toString();
    return `/users/${encodeURIComponent(userId)}/events${query ? `?${query}` : ''}`;
  },
  connectionRequests: () => '/connections',
  /** `PATCH` responde a uma solicitação recebida (task 230 [BE]); `DELETE` cancela ou desfaz (task 231 [BE]). */
  connection: (connectionId: string) => `/connections/${encodeURIComponent(connectionId)}`,
  businessFollow: (businessId: string) => `/businesses/${encodeURIComponent(businessId)}/follow`,
  /** `POST` bloqueia (task 088); `DELETE` desbloqueia e responde `204` (task 235 [BE]). */
  userBlock: (userId: string) => `/users/${encodeURIComponent(userId)}/block`,
  /** Quem a conta logada bloqueou, paginado por cursor (task 236 [BE]). */
  blockedUsers: (options?: { limit?: number; cursor?: string | null }) => {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    const query = params.toString();
    return `/users/me/blocked${query ? `?${query}` : ''}`;
  },
  /** Seguidores do estabelecimento logado, paginado por cursor e com busca por nome (task 282 [BE]). */
  businessFollowers: (options?: { limit?: number; cursor?: string | null; q?: string }) => {
    const params = new URLSearchParams();
    if (options?.q) params.set('q', options.q);
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    const query = params.toString();
    return `/businesses/me/followers${query ? `?${query}` : ''}`;
  },
  myPhotos: (options?: { limit?: number; cursor?: string | null }) => {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    const query = params.toString();
    return `/users/me/photos${query ? `?${query}` : ''}`;
  },
  devices: () => '/users/me/devices',
  device: (deviceToken: string) => `/users/me/devices/${encodeURIComponent(deviceToken)}`,
  /** Lista de conexões ativas paginada por cursor, com busca opcional por nome. */
  connections: (options?: { cursor?: string | null; search?: string }) => {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.search) params.set('q', options.search);
    const query = params.toString();
    return `/users/me/connections${query ? `?${query}` : ''}`;
  },
  /** Solicitações de conexão recebidas ainda pendentes. */
  connectionsPending: (cursor?: string | null) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();
    return `/users/me/connections/pending${query ? `?${query}` : ''}`;
  },
} as const;
