/**
 * Transições do favorito de um evento, sem React e sem I/O, para o
 * `useFavoriteEvent` guardar o estado num ref e o teste rodar em Node.
 */

export interface FavoriteRequest {
  eventId: string;
  target: boolean;
  previous: boolean;
}

export interface FavoriteState {
  eventId: string | undefined;
  isFavorited: boolean;
  inFlight: FavoriteRequest | null;
  /** Só esta falha pode ser repetida: qualquer toque depois dela expressa uma intenção mais nova. */
  lastFailure: FavoriteRequest | null;
}

export interface FavoriteStart {
  state: FavoriteState;
  request: FavoriteRequest | null;
}

/** Mesma forma do `isApiErrorLike` de `@/utils/apiErrors`. */
export interface FavoriteErrorInput {
  kind: string;
  status: number | null;
}

export type FavoriteErrorOutcome =
  | { kind: 'ignore' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'retry'; message: string }
  | { kind: 'failed'; message: string };

export function createFavoriteState(eventId: string | undefined, isFavorited: boolean): FavoriteState {
  return { eventId, isFavorited, inFlight: null, lastFailure: null };
}

export function setFavorite(state: FavoriteState, target: boolean): FavoriteStart {
  const cleared = state.lastFailure ? { ...state, lastFailure: null } : state;
  if (cleared.inFlight || !cleared.eventId || cleared.isFavorited === target) {
    return { state: cleared, request: null };
  }

  const request = { eventId: cleared.eventId, target, previous: cleared.isFavorited };
  return { state: { ...cleared, isFavorited: target, inFlight: request }, request };
}

export function retryFavorite(state: FavoriteState, failed: FavoriteRequest): FavoriteStart {
  if (state.lastFailure !== failed) return { state, request: null };
  return setFavorite(state, failed.target);
}

export function isCurrentRequest(state: FavoriteState, request: FavoriteRequest): boolean {
  return state.inFlight === request;
}

export function confirmFavorite(state: FavoriteState, request: FavoriteRequest): FavoriteState {
  if (!isCurrentRequest(state, request)) return state;
  return { ...state, isFavorited: request.target, inFlight: null };
}

export function revertFavorite(state: FavoriteState, request: FavoriteRequest): FavoriteState {
  if (!isCurrentRequest(state, request)) return state;
  return { ...state, isFavorited: request.previous, inFlight: null, lastFailure: request };
}

export function syncFavorite(state: FavoriteState, eventId: string | undefined, isFavorited: boolean): FavoriteState {
  if (state.eventId !== eventId) return createFavoriteState(eventId, isFavorited);
  // O GET pode ter saído antes do POST/DELETE em voo e traria o valor antigo.
  if (state.inFlight || state.isFavorited === isFavorited) return state;
  return { ...state, isFavorited };
}

export function favoriteErrorOutcome(error: FavoriteErrorInput | null, target: boolean): FavoriteErrorOutcome {
  if (error?.kind === 'network') return { kind: 'failed', message: 'Sem conexão com a internet' };
  if (error?.kind === 'timeout') return { kind: 'retry', message: 'A conexão demorou demais' };
  // O `apiFetch` já avisa a sessão expirada e volta para o Login.
  if (error?.status === 401) return { kind: 'ignore' };
  if (error?.status === 404) return { kind: 'unavailable', message: 'Este evento não está mais disponível' };

  return {
    kind: 'failed',
    message: target
      ? 'Não foi possível favoritar. Tente de novo.'
      : 'Não foi possível remover dos favoritos. Tente de novo.',
  };
}

/**
 * Mensagem do toast com a tela inativa: a pessoa já está em outra tela e precisa saber de
 * qual evento é a falha. `null` significa sem toast (`ignore` e `unavailable`).
 */
export function inactiveFavoriteMessage(
  error: FavoriteErrorInput | null,
  target: boolean,
  eventTitle: string | undefined,
): string | null {
  const outcome = favoriteErrorOutcome(error, target);
  if (outcome.kind === 'ignore' || outcome.kind === 'unavailable') return null;

  const title = eventTitle?.trim();
  if (!title) return outcome.message;

  // Por code point, para não partir um emoji no corte.
  const characters = Array.from(title);
  const shown = characters.length > 40 ? `${characters.slice(0, 40).join('').trimEnd()}…` : title;
  const failure = target
    ? `Não foi possível favoritar "${shown}".`
    : `Não foi possível remover "${shown}" dos favoritos.`;

  if (error?.kind === 'network' || error?.kind === 'timeout') return `${outcome.message}. ${failure}`;
  return `${failure} Tente de novo.`;
}
