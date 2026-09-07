import type { EventDetail, EventParticipant, ParticipantsResponse } from '@/types/event';

/**
 * Respostas de mentira dos endpoints de evento, ligadas por `USE_API_MOCKS`
 * em `@/constants/api`.
 *
 * Existe porque as tasks de backend 103, 097, 209 e 099 ainda não subiram.
 * O formato é cópia do contrato acordado, então quando o backend chegar é só
 * desligar a flag — nada nas telas nem nos hooks muda.
 *
 * O estado é mutável de propósito: aprovar, recusar, remover e cancelar
 * alteram o mock, para o fluxo inteiro poder ser percorrido no app.
 *
 * ## Cenários de teste
 *
 * O `event_id` da rota escolhe o cenário, para dar de testar os estados de
 * erro sem mexer no código — `/EventDetail?id=cancelled`, por exemplo:
 *
 * | `event_id`  | O que acontece                                          |
 * | ----------- | ------------------------------------------------------- |
 * | qualquer    | Caminho feliz, na visão do organizador                   |
 * | `guest`     | Visitante comum num evento público (ação `CONFIRM`)      |
 * | `private`   | Evento privado sem participação: sem lista de confirmados|
 * | `cancelled` | `410 Event was cancelled`                                |
 * | `missing`   | `404 Event not found`                                    |
 * | `boom`      | `500` no detalhe                                         |
 * | `offline`   | Falha de rede                                            |
 * | `forbidden` | `403` nos pendentes: só a seção de confirmados aparece    |
 * | `full`      | `409 Event is full` ao aprovar                           |
 * | `finished`  | `409 Event already finished` ao cancelar                 |
 */

/** Latência de mentira, para os estados de carregamento aparecerem de verdade. */
const MOCK_LATENCY_MS = 600;

const wait = (ms = MOCK_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/** Erro no formato que o `apiFetch` real produz, para o mock ser indistinguível. */
class MockApiError extends Error {
  readonly kind = 'http' as const;
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }

  is(status: number, detail?: string) {
    if (this.status !== status) return false;
    return detail === undefined || this.detail === detail;
  }
}

class MockNetworkError extends Error {
  readonly kind = 'network' as const;
  readonly status = null;
  readonly detail = null;

  constructor() {
    super('network');
    this.name = 'ApiError';
  }

  is() {
    return false;
  }
}

function pessoa(
  participantId: string,
  name: string,
  status: EventParticipant['status'],
  requestedAt?: string,
): EventParticipant {
  return {
    participant_id: participantId,
    user_id: `user-${participantId}`,
    name,
    user_type: 'PERSONAL',
    avatar_url: null,
    status,
    requested_at: requestedAt ?? null,
  };
}

const horasAtras = (horas: number) => new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();

function estadoInicial() {
  return {
    confirmed: [
      pessoa('p1', 'Viktor Gyokeres', 'CONFIRMED'),
      pessoa('p2', 'Enner Valencia', 'CONFIRMED'),
      pessoa('p3', 'Rafaela Souza', 'CONFIRMED'),
      pessoa('p4', 'Lucas Vieira', 'CONFIRMED'),
      pessoa('p5', 'Marina Duarte', 'CONFIRMED'),
      pessoa('p6', 'Caio Bernardes', 'CONFIRMED'),
      pessoa('p7', 'Helena Fontes', 'CONFIRMED'),
      pessoa('p8', 'Rodrigo Lima', 'CONFIRMED'),
      pessoa('p9', 'Bianca Teixeira', 'CONFIRMED'),
      pessoa('p10', 'Otavio Ramos', 'CONFIRMED'),
    ],
    pending: [
      pessoa('p11', 'Giovana Alves', 'PENDING', horasAtras(2)),
      pessoa('p12', 'Antonio Prado', 'PENDING', horasAtras(5)),
    ],
    cancelled: false,
  };
}

/** Estado vivo do mock — aprovar/recusar/remover/cancelar escrevem aqui. */
let db = estadoInicial();

/** Zera o mock, para percorrer o fluxo de novo sem recarregar o app. */
export function resetMock() {
  db = estadoInicial();
}

const DESCRICAO = [
  'Clássico Universitário na PUC',
  '',
  'Prepare-se para uma tarde de pura emoção, torcida e espírito universitário!',
  'O Jogo de Futebol Universitário da PUC promete unir estudantes, atletas e apaixonados pelo esporte em um evento cheio de energia e diversão. Será o momento perfeito para vibrar com cada jogada, torcer pelo seu time e celebrar o orgulho de vestir as cores da universidade.',
].join('\n');

function detalhe(eventId: string): EventDetail {
  const ehOrganizador = eventId !== 'guest' && eventId !== 'private';
  const ehPrivado = eventId === 'private';

  return {
    event_id: eventId,
    title: 'Futebol na PUC',
    description: DESCRICAO,
    event_date: '2026-10-30T16:00:00Z',
    end_date: '2026-10-30T19:00:00Z',
    location: { latitude: -30.0577, longitude: -51.1738 },
    location_name: 'DRY Moments',
    privacy: ehPrivado ? 'PRIVATE' : 'INVITE_ONLY',
    status: db.cancelled ? 'CANCELLED' : 'PUBLISHED',
    cover_photo_url: 'https://picsum.photos/seed/hangy-evento/900/600',
    tags: [
      { id: 't1', name: 'Esportes' },
      { id: 't2', name: 'Futebol' },
    ],
    organizer: { id: 'org-1', name: 'Ana Souza', user_type: 'PERSONAL', avatar_url: null },
    viewer: {
      is_organizer: ehOrganizador,
      participation_status: null,
      // Num evento privado em que não participo, a lista de confirmados some.
      can_see_participants: !ehPrivado,
      available_action: ehOrganizador ? 'SHARE' : 'CONFIRM',
    },
    participants_preview: ehPrivado
      ? null
      : {
          count: db.confirmed.length,
          items: db.confirmed.slice(0, 5),
          interested_count: 6,
        },
    pending_requests_count: ehOrganizador ? db.pending.length : undefined,
  };
}

function participantes(eventId: string): ParticipantsResponse {
  // 403 nos pendentes: a tela só pode mostrar os confirmados.
  const podeGerenciar = eventId !== 'forbidden';

  return {
    confirmed: db.confirmed,
    pending: podeGerenciar ? db.pending : [],
    confirmed_count: db.confirmed.length,
    pending_count: podeGerenciar ? db.pending.length : 0,
    can_manage: podeGerenciar,
  };
}

/** `/events/aa11/participants/p11` -> `['events', 'aa11', 'participants', 'p11']` */
function segmentos(path: string) {
  return path.split('?')[0].split('/').filter(Boolean);
}

function erroDoCenario(eventId: string) {
  if (eventId === 'cancelled') throw new MockApiError(410, 'Event was cancelled');
  if (eventId === 'missing') throw new MockApiError(404, 'Event not found');
  if (eventId === 'boom') throw new MockApiError(500, 'Internal server error');
  if (eventId === 'offline') throw new MockNetworkError();
}

/**
 * Encaminha uma rota para a resposta de mentira correspondente. A assinatura
 * espelha a de `apiFetch` de propósito: quem chama não sabe qual dos dois
 * respondeu.
 */
export async function resolveMock<T>(path: string, init: RequestInit = {}): Promise<T> {
  await wait();

  const method = (init.method ?? 'GET').toUpperCase();
  const partes = segmentos(path);
  const eventId = partes[1] ?? '';

  if (partes[0] === 'events' && partes.length === 2 && method === 'GET') {
    erroDoCenario(eventId);
    return detalhe(eventId) as T;
  }

  if (partes[0] === 'events' && partes[2] === 'participants' && partes.length === 3) {
    erroDoCenario(eventId);
    return participantes(eventId) as T;
  }

  if (partes[0] === 'events' && partes[2] === 'cancel' && method === 'POST') {
    if (eventId === 'finished') throw new MockApiError(409, 'Event already finished');
    db.cancelled = true;
    return { status: 'CANCELLED' } as T;
  }

  if (partes[0] === 'events' && partes[2] === 'participants' && partes.length === 4) {
    const participantId = partes[3];
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const alvo =
      db.pending.find((p) => p.participant_id === participantId) ??
      db.confirmed.find((p) => p.participant_id === participantId);

    if (!alvo) throw new MockApiError(404, 'Participant not found');

    if (body.status === 'CONFIRMED') {
      if (eventId === 'full') throw new MockApiError(409, 'Event is full');
      db.pending = db.pending.filter((p) => p.participant_id !== participantId);
      db.confirmed = [...db.confirmed, { ...alvo, status: 'CONFIRMED' }];
    }

    if (body.status === 'REJECTED') {
      db.pending = db.pending.filter((p) => p.participant_id !== participantId);
    }

    if (body.status === 'REMOVED') {
      db.confirmed = db.confirmed.filter((p) => p.participant_id !== participantId);
    }

    return { ...alvo, status: body.status } as T;
  }

  throw new MockApiError(404, 'Not found');
}
