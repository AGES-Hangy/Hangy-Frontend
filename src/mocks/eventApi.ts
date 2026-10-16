import type {
  EventDetail,
  EventParticipant,
  EventParticipantItem,
  EventShare,
  ParticipantsPage,
} from '@/types/event';
import type { PersonalProfileResponse } from '@/types/profile';
import type {
  ConnectionRequestResult,
  UserEventItem,
  UserEventsPage,
  UserEventsTab,
  UserEventsTabs,
  UserPhoto,
  UserProfile,
} from '@/types/user';
import { API_TIMEOUT_MS } from '@/constants/api';

/**
 * Respostas de mentira dos endpoints de evento, ligadas por `USE_API_MOCKS`
 * em `@/constants/api`.
 *
 * Existe porque as tasks de backend 103, 097, 209, 099 e 101 ainda não
 * subiram. O formato é cópia do contrato acordado, então quando o backend
 * chegar é só desligar a flag — nada nas telas nem nos hooks muda.
 *
 * Também cobre `GET /terms/current` (task 212 [BE], também não subiu) pelo
 * mesmo motivo — não é um endpoint de evento, mas é só mais um backend que
 * falta, e criar um segundo arquivo/dispatcher pra um caso só seria over-engineering.
 *
 * Pelo mesmo motivo cobre `GET /users/{id}` e `GET /users/{id}/events` (tasks
 * 075 e 228 [BE]), usados pelo perfil de outro usuário.
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
 * | `private`   | Evento privado sem participação: sem lista de confirmados, local aproximado (bairro) |
 * | `private-no-area` | Igual a `private`, mas sem bairro: "Local aproximado" |
 * | `private-confirmed` | Evento privado já aprovado: local exato          |
 * | `cancelled` | `410 Event was cancelled` (`/share`: `404`, ver task 101) |
 * | `missing`   | `404 Event not found`                                    |
 * | `boom`      | `500` no detalhe                                         |
 * | `offline`   | Falha de rede                                            |
 * | `forbidden` | `403` nos pendentes: só a seção de confirmados aparece    |
 * | `full`      | `409 Event is full` ao aprovar                           |
 * | `finished`  | `409 Event already finished` ao cancelar                 |
 *
 * Nas rotas de usuário, o `user_id` escolhe o cenário (`/UserProfile?id=pending`):
 *
 * | `user_id`          | Perfil                                    | Eventos                |
 * | ------------------ | ----------------------------------------- | ---------------------- |
 * | qualquer           | Pessoa sem conexão (Conectar)             | 3 por aba              |
 * | `pending`          | Pessoa com solicitação enviada            | 3 por aba              |
 * | `connected`        | Pessoa conectada                          | 3 por aba              |
 * | `business`         | Estabelecimento sem seguir                | 3 por aba              |
 * | `following`        | Estabelecimento seguido                   | 3 por aba              |
 * | `minimal`          | Sem nome, bio, foto e tags                | Abas vazias            |
 * | `events-boom`      | Pessoa sem conexão                        | `500`                  |
 * | `many-events`      | Pessoa sem conexão                        | 45 por aba, 3 páginas  |
 * | `events-page-boom` | Pessoa sem conexão                        | 45 por aba, 2ª: `500`  |
 * | `events-flaky`     | Pessoa sem conexão                        | 1ª: `500`, depois 45   |
 * | `long-flaky`       | Perfil: 1ª chamada OK, depois `500`       | 45 por aba             |
 * | `missing`          | `404 User not found`                      | `404`                  |
 * | `boom`             | `500`                                     | `500`                  |
 * | `offline`          | Falha de rede                             | Falha de rede          |
 * | `slow`             | Timeout, após `API_TIMEOUT_MS`            | Timeout                |
 * | `flaky`            | 1ª chamada OK, depois `500`               | Idem                   |
 * | `flaky-slow`       | 1ª chamada OK, depois timeout             | Idem                   |
 *
 * `flaky` e `flaky-slow` contam as chamadas por rota; recarregar o app (ou
 * `resetMock`) zera a contagem.
 *
 * `GET /users/{id}/events` devolve as abas de quem visita, `history` (encerrados)
 * e `created` (criados e não encerrados), com `interests` e `confirmed` em
 * `null`. Com `tab` e `cursor` vem só a continuação daquela aba. Com o id da
 * conta logada (`me`), vêm as quatro abas do dono, com privados (veja abaixo).
 *
 * Conectar (`POST /connections`), seguir (`POST`/`DELETE
 * /businesses/{id}/follow`) e bloquear (`POST /users/{id}/block`) alteram o
 * estado do mock, então o GET seguinte já devolve o resultado da ação.
 * Recarregar o app (ou `resetMock`) desfaz tudo. Bloquear qualquer outro perfil
 * responde `204`, e o GET seguinte vem `404`.
 *
 * | `user_id`          | Perfil                       | Ação                                        |
 * | ------------------ | ---------------------------- | ------------------------------------------- |
 * | qualquer pessoa    | Sem conexão                  | Conectar: `201`, passa a PENDING            |
 * | `pending`          | Solicitação enviada          | Conectar: `409`                             |
 * | `connected`        | Conectada                    | Conectar: `409`                             |
 * | `rejected`         | `REJECTED`                   | Conectar: `409`                             |
 * | `connect-conflict` | Sem conexão                  | Conectar: `409`, o GET seguinte vem PENDING |
 * | `connect-boom`     | Sem conexão                  | Conectar: `500`                             |
 * | `connect-gone`     | Sem conexão                  | Conectar: `404`, o GET seguinte vem `404`   |
 * | `business`         | Sem seguir, 1204 seguidores  | Seguir: `204`, +1                           |
 * | `following`        | Seguindo, 1205 seguidores    | Deixar de seguir: `204`, −1                 |
 * | `business-boom`    | Sem seguir, 1204 seguidores  | Seguir: `500`                               |
 * | `following-boom`   | Seguindo, 1205 seguidores    | Deixar de seguir: `500`                     |
 * | `follow-gone`      | Sem seguir, 1204 seguidores  | Seguir: `404`, o GET seguinte vem `404`     |
 * | `unfollow-gone`    | Seguindo, 1205 seguidores    | Deixar de seguir: `404`, GET seguinte `404` |
 * | `one-connection`   | Sem conexão, 1 conexão       | Conectar: `201`, passa a PENDING            |
 * | `one-follower`     | Sem seguir, 1 seguidor       | Seguir: `204`, +1                           |
 * | `block-already`    | Sem conexão                  | Bloquear: `409`, o GET seguinte vem `404`   |
 * | `block-gone`       | Sem conexão                  | Bloquear: `404`, o GET seguinte vem `404`   |
 * | `block-boom`       | Sem conexão                  | Bloquear: `500`                             |
 *
 * Perfil próprio (`GET /users/me/photos`, `GET /users/me/events` e os
 * contadores de `GET /users/me/profile`): o cenário vem de
 * `EXPO_PUBLIC_MOCK_OWN_PROFILE`, lida quando o Metro inicia. Trocar o valor
 * exige reiniciar o Metro (sem precisar de `-c`).
 *
 * | Valor              | Fotos                                                | Eventos do dono                                      | Contadores (`GET /users/me/profile`)                                                   |
 * | ------------------ | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
 * | `full` (padrão)    | 45 fotos, em duas páginas com o `limit` padrão (30)  | Criados 4, Interesses 2, Confirmados 2, Histórico 25 | 134 conexões, 25 encerrados, 2 confirmados, 45 fotos                                   |
 * | `empty`            | Lista vazia                                          | Abas vazias                                          | Zerados                                                                                |
 * | `error`            | `500` na primeira página                             | `500` na primeira carga                              | Como em `full`                                                                         |
 * | `error-page`       | Primeira página OK, `500` na seguinte                | Primeira carga OK, `500` no "Ver mais"               | Como em `full`                                                                         |
 * | `profile-error`    | Como em `full`                                       | Como em `full`                                       | `500` sempre, também na leitura do Editar perfil                                       |
 * | `profile-flaky`    | Como em `full`                                       | Como em `full`                                       | 1ª chamada como em `full`, depois `500`; a leitura do Editar perfil conta como chamada |
 * | `own-events-flaky` | Como em `full`                                       | 1ª carga OK, recargas `500`; "Ver mais" demora 3 s   | Como em `full`                                                                         |
 * | `photos-grow`      | 45 na 1ª carga; 46 (uma nova no topo) a partir da 2ª | Como em `full`                                       | 45 fotos na 1ª chamada; 46 a partir da 2ª                                              |
 *
 * `offline` simula só a falha de rede da requisição. O `OfflineBanner` e o
 * botão de relacionamento desabilitado dependem do estado real da rede
 * (modo avião).
 */

/** Latência de mentira, para os estados de carregamento aparecerem de verdade. */
const MOCK_LATENCY_MS = 600;

type CenarioPerfilProprio =
  | 'full'
  | 'empty'
  | 'error'
  | 'error-page'
  | 'profile-error'
  | 'profile-flaky'
  | 'own-events-flaky'
  | 'photos-grow';
const CENARIOS_PERFIL_PROPRIO: readonly string[] = [
  'full',
  'empty',
  'error',
  'error-page',
  'profile-error',
  'profile-flaky',
  'own-events-flaky',
  'photos-grow',
];
const valorDoCenarioPerfilProprio = process.env.EXPO_PUBLIC_MOCK_OWN_PROFILE;
const cenarioPerfilProprio: CenarioPerfilProprio =
  valorDoCenarioPerfilProprio && CENARIOS_PERFIL_PROPRIO.includes(valorDoCenarioPerfilProprio)
    ? (valorDoCenarioPerfilProprio as CenarioPerfilProprio)
    : 'full';

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

class MockTimeoutError extends Error {
  readonly kind = 'timeout' as const;
  readonly status = null;
  readonly detail = null;

  constructor() {
    super('timeout');
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
    chamadasDeUsuario: {} as Record<string, number>,
    relacoesDeUsuario: {} as Record<string, RelacaoDoUsuario>,
    usuariosIndisponiveis: [] as string[],
    /** Campos editados por `PATCH /events/{id}`, sobrepostos ao evento padrão. */
    overrides: null as null | {
      title: string;
      description: string | null;
      cover_photo_url: string | null;
      event_date: string;
      end_date: string;
      location: { latitude: number; longitude: number };
      location_name: string | null;
      tag_ids: string[];
    },
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

/** Só os dois ids que este mock conhece — `useTags` não passa por `resolveMock`. */
const NOME_DA_TAG: Record<string, string> = { t1: 'Esportes', t2: 'Futebol' };

/** Cenários de evento privado visto por quem não organiza. */
const CENARIOS_PRIVADOS = ['private', 'private-no-area', 'private-confirmed'];

const ehVisitante = (eventId: string) => eventId === 'guest' || CENARIOS_PRIVADOS.includes(eventId);

function detalhe(eventId: string): EventDetail {
  const ehOrganizador = !ehVisitante(eventId);
  const ehPrivado = CENARIOS_PRIVADOS.includes(eventId);
  const aprovado = eventId === 'private-confirmed';
  // Privado sem aprovação: a API troca o endereço pelo bairro e o ponto pelo
  // centro de uma área. Depois de aprovado, volta tudo exato.
  const localAproximado = ehPrivado && !aprovado;
  const overrides = db.overrides;

  return {
    event_id: eventId,
    title: overrides?.title ?? 'Futebol na PUC',
    description: overrides?.description ?? DESCRICAO,
    // O frame mostra 16:00 em Porto Alegre (UTC-3).
    event_date: overrides?.event_date ?? '2026-10-30T19:00:00Z',
    end_date: overrides?.end_date ?? '2026-10-30T22:00:00Z',
    location: localAproximado
      ? { latitude: -30.0531, longitude: -51.1762 }
      : (overrides?.location ?? { latitude: -30.0577, longitude: -51.1738 }),
    location_name: localAproximado
      ? eventId === 'private-no-area'
        ? null
        : 'Partenon, Porto Alegre'
      : (overrides?.location_name ?? 'DRY Moments'),
    location_precision: localAproximado ? 'APPROXIMATE' : 'EXACT',
    location_radius_m: localAproximado ? 500 : null,
    privacy: ehPrivado ? 'PRIVATE' : eventId === 'guest' ? 'PUBLIC' : 'INVITE_ONLY',
    status: db.cancelled ? 'CANCELLED' : eventId === 'finished' ? 'FINISHED' : 'PUBLISHED',
    cover_photo_url: overrides?.cover_photo_url ?? 'https://picsum.photos/seed/hangy-evento/900/600',
    tags: (overrides?.tag_ids ?? ['t1', 't2']).map((id) => ({ id, name: NOME_DA_TAG[id] ?? id })),
    organizer: { id: 'org-1', name: 'Ana Souza', user_type: 'PERSONAL', avatar_url: null },
    viewer: {
      is_organizer: ehOrganizador,
      participation_status: aprovado ? 'CONFIRMED' : null,
      // Num evento privado em que não participo, a lista de confirmados some.
      can_see_participants: !localAproximado,
      available_action: ehOrganizador
        ? 'SHARE'
        : aprovado
          ? 'CANCEL_PRESENCE'
          : ehPrivado
            ? 'REQUEST'
            : 'CONFIRM',
    },
    participants_preview: localAproximado
      ? null
      : {
          count: db.confirmed.length,
          items: db.confirmed.slice(0, 5),
          interested_count: 6,
        },
    pending_requests_count: ehOrganizador ? db.pending.length : undefined,
  };
}

/** A API real não manda `avatar_url`/`user_type` nesta lista — só no preview do detalhe. */
function paraItem(pessoa: EventParticipant): EventParticipantItem {
  return {
    participant_id: pessoa.participant_id,
    user: { id: pessoa.user_id, name: pessoa.name },
    status: pessoa.status,
    joined_at: pessoa.requested_at ?? new Date().toISOString(),
  };
}

/**
 * Espelha `GET /events/{id}/participants`: sem `status` devolve confirmados;
 * `status=PENDING` exige ser organizador (o cenário `forbidden` simula a
 * negativa mesmo sendo organizador, pra testar que a seção só some).
 */
function participantes(eventId: string, statusFiltro: string | null): ParticipantsPage {
  const pedindoPendentes = statusFiltro === 'PENDING';
  if (pedindoPendentes && eventId === 'forbidden') {
    throw new MockApiError(403, 'Only the organizer can list pending participants');
  }

  const ehOrganizador = !ehVisitante(eventId);
  const items = pedindoPendentes ? db.pending : db.confirmed;

  const counts: ParticipantsPage['counts'] = { CONFIRMED: db.confirmed.length };
  if (ehOrganizador) counts.PENDING = db.pending.length;

  return {
    items: items.map(paraItem),
    counts,
    next_cursor: null,
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
 * `/share` não distingue cancelado de inexistente — a task 101 devolve 404
 * pros dois ("evento inexistente, cancelado ou invisível para quem pede"),
 * diferente do 410 que `/events/{id}` usa só para o cancelado.
 */
function erroCompartilhar(eventId: string) {
  if (eventId === 'missing' || eventId === 'cancelled') {
    throw new MockApiError(404, 'Event not found');
  }
  if (eventId === 'boom') throw new MockApiError(500, 'Internal server error');
  if (eventId === 'offline') throw new MockNetworkError();
}

function compartilhar(eventId: string): EventShare {
  const evento = detalhe(eventId);

  return {
    url: `hangy://event/${eventId}`,
    web_url: `https://hangy.app/e/${eventId}`,
    title: evento.title,
    event_date: evento.event_date,
    location_name: evento.location_name ?? '',
    cover_photo_url: evento.cover_photo_url,
  };
}

const EVENTOS_CRIADOS_DO_USUARIO: UserEventItem[] = [
  {
    event_id: 'guest',
    title: 'Futebol na PUC',
    event_date: '2026-10-30T19:00:00Z',
    location_name: 'DRY Moments',
    cover_photo_url: 'https://picsum.photos/seed/hangy-evento/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'pelada-parcao',
    title: 'Pelada no Parcão',
    event_date: '2026-11-08T13:00:00Z',
    location_name: 'Parcão',
    cover_photo_url: 'https://picsum.photos/seed/hangy-parcao/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'corrida-orla',
    title: 'Corrida na Orla',
    event_date: '2026-11-15T10:00:00Z',
    location_name: 'Orla do Guaíba',
    cover_photo_url: null,
    privacy: 'PUBLIC',
    participation_status: null,
  },
];

const EVENTOS_PASSADOS_DO_USUARIO: UserEventItem[] = [
  {
    event_id: 'trilha-morro',
    title: 'Trilha no Morro do Osso',
    event_date: '2026-09-20T12:00:00Z',
    location_name: 'Morro do Osso',
    cover_photo_url: 'https://picsum.photos/seed/hangy-trilha/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'brunch-moinhos',
    title: 'Brunch no Moinhos',
    event_date: '2026-08-30T14:00:00Z',
    location_name: 'Moinhos de Vento',
    cover_photo_url: 'https://picsum.photos/seed/hangy-brunch/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'cinema-casa',
    title: 'Cinema na Casa de Cultura',
    event_date: '2026-07-12T22:00:00Z',
    location_name: 'Casa de Cultura Mario Quintana',
    cover_photo_url: null,
    privacy: 'PUBLIC',
    participation_status: null,
  },
];

const LIMITE_PADRAO_DE_EVENTOS = 20;
const TOTAL_DE_EVENTOS_NA_PAGINACAO = 45;
const UM_DIA_MS = 24 * 60 * 60 * 1000;
const COM_MUITOS_EVENTOS = new Set(['many-events', 'events-page-boom', 'events-flaky', 'long-flaky']);

type AbaDeVisitante = 'history' | 'created';

function muitosEventos(aba: AbaDeVisitante): UserEventItem[] {
  const primeiro = aba === 'created' ? Date.UTC(2026, 10, 1, 19) : Date.UTC(2026, 8, 30, 19);
  const passo = aba === 'created' ? UM_DIA_MS : -UM_DIA_MS;
  return Array.from({ length: TOTAL_DE_EVENTOS_NA_PAGINACAO }, (_, indice) => ({
    event_id: `${aba}-${indice + 1}`,
    title: `${aba === 'created' ? 'Evento criado' : 'Evento passado'} ${indice + 1}`,
    event_date: new Date(primeiro + indice * passo).toISOString(),
    location_name: 'Porto Alegre',
    cover_photo_url: `https://picsum.photos/seed/hangy-${aba}-${indice + 1}/900/600`,
    privacy: 'PUBLIC',
    participation_status: null,
  }));
}

function eventosDaAba(userId: string, aba: AbaDeVisitante): UserEventItem[] {
  if (userId === 'minimal') return [];
  if (COM_MUITOS_EVENTOS.has(userId)) return muitosEventos(aba);
  return aba === 'created' ? EVENTOS_CRIADOS_DO_USUARIO : EVENTOS_PASSADOS_DO_USUARIO;
}

function paginaDeEventos(eventos: UserEventItem[], cursor: string | null, limite: number): UserEventsPage {
  const inicio = cursor ? Number(cursor) : 0;
  const items = eventos.slice(inicio, inicio + limite);
  const fim = inicio + items.length;
  return { items, next_cursor: fim < eventos.length ? String(fim) : null };
}

type RelacaoDoUsuario = Partial<
  Pick<UserProfile, 'connection_status' | 'is_following' | 'connections_count'>
>;

const ESTABELECIMENTOS = new Set([
  'business',
  'following',
  'business-boom',
  'following-boom',
  'follow-gone',
  'unfollow-gone',
  'one-follower',
]);
const SEGUIDOS_DE_INICIO = new Set(['following', 'following-boom', 'unfollow-gone']);
const SEGUIDORES_INICIAIS = 1204;
/** Contadores no singular, para conferir "1 Conexão" e "1 Seguidor". */
const CONTAGEM_INICIAL: Record<string, number> = { 'one-connection': 1, 'one-follower': 1 };

function statusDeConexaoInicial(userId: string): UserProfile['connection_status'] {
  if (userId === 'pending') return 'PENDING';
  if (userId === 'connected') return 'CONFIRMED';
  if (userId === 'rejected') return 'REJECTED';
  return null;
}

function atualizarRelacao(userId: string, mudanca: RelacaoDoUsuario) {
  db.relacoesDeUsuario[userId] = { ...db.relacoesDeUsuario[userId], ...mudanca };
}

function perfil(userId: string): UserProfile {
  return { ...perfilInicial(userId), ...db.relacoesDeUsuario[userId] };
}

function perfilInicial(userId: string): UserProfile {
  if (userId === 'minimal') {
    return {
      id: userId,
      user_type: 'PERSONAL',
      name: null,
      description: null,
      photo_url: null,
      tags: [],
      connection_status: null,
      is_following: false,
      connections_count: 0,
    };
  }

  const ehEstabelecimento = ESTABELECIMENTOS.has(userId);
  const segue = SEGUIDOS_DE_INICIO.has(userId);

  return {
    id: userId,
    user_type: ehEstabelecimento ? 'BUSINESS' : 'PERSONAL',
    name: ehEstabelecimento ? 'DRY Moments' : 'Bruno Lima',
    description: ehEstabelecimento
      ? 'Bar e eventos na Cidade Baixa.'
      : 'Futebol aos sábados e trilha quando dá.',
    photo_url: 'https://picsum.photos/seed/hangy-perfil/300/300',
    tags: [
      { id: 't1', name: 'Esportes' },
      { id: 't2', name: 'Futebol' },
    ],
    connection_status: ehEstabelecimento ? null : statusDeConexaoInicial(userId),
    is_following: segue,
    connections_count:
      CONTAGEM_INICIAL[userId] ?? (ehEstabelecimento ? SEGUIDORES_INICIAIS + (segue ? 1 : 0) : 8),
  };
}

const TOTAL_DE_FOTOS_DO_PERFIL_PROPRIO = 45;
const LIMITE_PADRAO_DE_FOTOS = 30;
const EVENTOS_DAS_FOTOS = [
  { id: 'guest', title: 'Futebol na PUC' },
  { id: 'pelada-parcao', title: 'Pelada no Parcão' },
  { id: 'corrida-orla', title: 'Corrida na Orla' },
];

/**
 * Em `photos-grow`, a lista e o contador ganham uma foto a partir da segunda
 * chamada de cada rota, como se a pessoa tivesse publicado uma foto em outra tela.
 */
function cresceuAFoto(rota: 'fotos' | 'contadores') {
  return cenarioPerfilProprio === 'photos-grow' && (db.chamadasDeUsuario[`photos-grow:${rota}`] ?? 0) > 1;
}

function contarChamadaDoPhotosGrow(rota: 'fotos' | 'contadores') {
  if (cenarioPerfilProprio !== 'photos-grow') return;
  const chave = `photos-grow:${rota}`;
  db.chamadasDeUsuario[chave] = (db.chamadasDeUsuario[chave] ?? 0) + 1;
}

function fotosDoPerfilProprio(): UserPhoto[] {
  if (cenarioPerfilProprio === 'empty') return [];
  const maisRecente = Date.UTC(2026, 9, 10, 18);
  const fotos = Array.from({ length: TOTAL_DE_FOTOS_DO_PERFIL_PROPRIO }, (_, indice) => ({
    photo_id: `foto-${indice + 1}`,
    photo_url: `https://picsum.photos/seed/hangy-foto-${indice + 1}/600/600`,
    event: EVENTOS_DAS_FOTOS[indice % EVENTOS_DAS_FOTOS.length],
    created_at: new Date(maisRecente - indice * 60 * 60 * 1000).toISOString(),
  }));
  if (!cresceuAFoto('fotos')) return fotos;
  const nova = {
    photo_id: 'foto-nova',
    photo_url: 'https://picsum.photos/seed/hangy-foto-nova/600/600',
    event: EVENTOS_DAS_FOTOS[0],
    created_at: new Date(maisRecente + 60 * 60 * 1000).toISOString(),
  };
  return [nova, ...fotos];
}

const EVENTOS_CRIADOS_DO_DONO: UserEventItem[] = [
  {
    event_id: 'por-do-sol-cais',
    title: 'Pôr do sol no Cais',
    event_date: '2026-11-16T19:00:00Z',
    location_name: 'Cais do Porto',
    cover_photo_url: 'https://picsum.photos/seed/hangy-cais/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'futebol-orla',
    title: 'Futebol na Orla',
    event_date: '2026-11-17T13:00:00Z',
    location_name: 'Orla do Guaíba',
    cover_photo_url: 'https://picsum.photos/seed/hangy-futebol/900/600',
    privacy: 'INVITE_ONLY',
    participation_status: null,
  },
  {
    event_id: 'noite-amigos',
    title: 'Noite com os Amigos',
    event_date: '2026-11-22T00:00:00Z',
    location_name: 'Av. Soledade',
    cover_photo_url: 'https://picsum.photos/seed/hangy-noite/900/600',
    privacy: 'PRIVATE',
    participation_status: null,
  },
  // Rascunho: o `UserEventOutput` não tem `event_status`, então ele chega
  // igual aos outros.
  {
    event_id: 'churrasco-rascunho',
    title: 'Churrasco de fim de ano',
    event_date: '2026-12-20T15:00:00Z',
    location_name: null,
    cover_photo_url: null,
    privacy: 'PUBLIC',
    participation_status: null,
  },
];

const EVENTOS_DE_INTERESSE_DO_DONO: UserEventItem[] = [
  {
    event_id: 'samba-cidade-baixa',
    title: 'Roda de samba na Cidade Baixa',
    event_date: '2026-11-20T22:00:00Z',
    location_name: 'Cidade Baixa',
    cover_photo_url: 'https://picsum.photos/seed/hangy-samba/900/600',
    privacy: 'PUBLIC',
    participation_status: null,
  },
  {
    event_id: 'brique-redencao',
    title: 'Brique da Redenção',
    event_date: '2026-11-29T13:00:00Z',
    location_name: 'Parque Farroupilha',
    cover_photo_url: null,
    privacy: 'PUBLIC',
    participation_status: null,
  },
];

const EVENTOS_CONFIRMADOS_DO_DONO: UserEventItem[] = [
  {
    event_id: 'private-confirmed',
    title: 'Jantar no Bom Fim',
    event_date: '2026-11-18T23:00:00Z',
    location_name: 'Bom Fim',
    cover_photo_url: 'https://picsum.photos/seed/hangy-jantar/900/600',
    privacy: 'PRIVATE',
    participation_status: 'CONFIRMED',
  },
  {
    event_id: 'trilha-itapua',
    title: 'Trilha em Itapuã',
    event_date: '2026-12-05T11:00:00Z',
    location_name: 'Parque de Itapuã',
    cover_photo_url: 'https://picsum.photos/seed/hangy-itapua/900/600',
    privacy: 'PUBLIC',
    participation_status: 'CONFIRMED',
  },
];

const TOTAL_DO_HISTORICO_DO_DONO = 25;
/** Tempo do "Ver mais" em `own-events-flaky`: dá para sair e voltar à aba no meio dele. */
const VER_MAIS_LENTO_MS = 3000;
const ABAS_DE_VISITANTE: readonly UserEventsTab[] = ['history', 'created'];
const ABAS_DO_DONO: readonly UserEventsTab[] = ['history', 'created', 'interests', 'confirmed'];

/** Encerrados, alternando os que o dono criou e os que confirmou, com as três privacidades. */
function historicoDoDono(): UserEventItem[] {
  const privacidades = ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'] as const;
  const maisRecente = Date.UTC(2026, 9, 10, 19);
  return Array.from({ length: TOTAL_DO_HISTORICO_DO_DONO }, (_, indice) => ({
    event_id: `encerrado-${indice + 1}`,
    title: `Evento encerrado ${indice + 1}`,
    event_date: new Date(maisRecente - indice * 3 * UM_DIA_MS).toISOString(),
    location_name: 'Porto Alegre',
    cover_photo_url: `https://picsum.photos/seed/hangy-encerrado-${indice + 1}/900/600`,
    privacy: privacidades[indice % privacidades.length],
    participation_status: indice % 2 === 0 ? null : 'CONFIRMED',
  }));
}

function eventosDoDono(aba: UserEventsTab): UserEventItem[] {
  if (cenarioPerfilProprio === 'empty') return [];
  if (aba === 'history') return historicoDoDono();
  if (aba === 'created') return EVENTOS_CRIADOS_DO_DONO;
  if (aba === 'interests') return EVENTOS_DE_INTERESSE_DO_DONO;
  return EVENTOS_CONFIRMADOS_DO_DONO;
}

/** Contadores de `GET /users/me/profile` coerentes com as abas e as fotos do dono. */
function contadoresDoDono() {
  if (cenarioPerfilProprio === 'empty') {
    return { connections_count: 0, counts: { past: 0, confirmed: 0, photos: 0 } };
  }
  return {
    connections_count: 134,
    counts: {
      past: TOTAL_DO_HISTORICO_DO_DONO,
      confirmed: EVENTOS_CONFIRMADOS_DO_DONO.length,
      photos: TOTAL_DE_FOTOS_DO_PERFIL_PROPRIO + (cresceuAFoto('contadores') ? 1 : 0),
    },
  };
}

async function erroDoUsuario(userId: string, rota: 'perfil' | 'eventos') {
  if (userId === 'missing' || db.usuariosIndisponiveis.includes(userId)) {
    throw new MockApiError(404, 'User not found');
  }
  if (userId === 'boom') throw new MockApiError(500, 'Internal server error');
  if (userId === 'offline') throw new MockNetworkError();
  if (userId === 'slow') {
    await wait(API_TIMEOUT_MS);
    throw new MockTimeoutError();
  }

  // Só o perfil falha: o "Tentar de novo" do toast não pode recarregar a lista
  // longa que já está na tela.
  if (userId === 'long-flaky' && rota === 'perfil') {
    const chave = `${rota}:${userId}`;
    const chamadas = (db.chamadasDeUsuario[chave] ?? 0) + 1;
    db.chamadasDeUsuario[chave] = chamadas;
    if (chamadas > 1) throw new MockApiError(500, 'Internal server error');
  }

  // Só a primeira carga dos eventos falha, para testar o "Tentar de novo" da seção.
  if (userId === 'events-flaky' && rota === 'eventos') {
    const chave = `${rota}:${userId}`;
    const chamadas = (db.chamadasDeUsuario[chave] ?? 0) + 1;
    db.chamadasDeUsuario[chave] = chamadas;
    if (chamadas === 1) throw new MockApiError(500, 'Internal server error');
  }

  if (userId === 'flaky' || userId === 'flaky-slow') {
    const chave = `${rota}:${userId}`;
    const chamadas = (db.chamadasDeUsuario[chave] ?? 0) + 1;
    db.chamadasDeUsuario[chave] = chamadas;
    if (chamadas === 1) return;

    if (userId === 'flaky') throw new MockApiError(500, 'Internal server error');
    await wait(API_TIMEOUT_MS);
    throw new MockTimeoutError();
  }
}

/**
 * Editar perfil (task 072): as rotas de perfil (tasks de backend 067, 071, 077
 * e 229) e a exclusão de conta ainda não existem. `EXPO_PUBLIC_MOCK_USER_TYPE=BUSINESS`
 * troca a conta de mentira para estabelecimento.
 */
const MOCK_USER_TYPE = process.env.EXPO_PUBLIC_MOCK_USER_TYPE === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL';

const ARVORE_DE_TAGS = [
  ['Esportes', ['Futebol', 'Vôlei', 'Corrida', 'Basquete', 'Ciclismo']],
  ['Gastronomia', ['Café', 'Brunch', 'Churrasco', 'Vinhos']],
  ['Música', ['Rock', 'Pop', 'Sertanejo', 'Eletrônica']],
  ['Bem-estar', ['Yoga', 'Meditação']],
  ['Cultura', ['Museus', 'Literatura']],
  ['Vida Noturna', ['Show ao vivo', 'Balada', 'Bar']],
  ['Tecnologia', ['Meetups', 'Hackathons']],
  ['Ar Livre', ['Trilha', 'Camping']],
  ['Jogos', ['Tabuleiro', 'Poker']],
  ['Arte', ['Teatro', 'Cinema', 'Exposição', 'Fotografia']],
  ['Viagem', ['Bate-volta', 'Mochilão']],
  ['Negócios', ['Networking', 'Palestras']],
].map(([nome, micros], macro) => ({
  id: `macro-${macro}`,
  name: nome as string,
  type: 'MACRO' as const,
  children: (micros as string[]).map((micro, indice) => ({
    id: `micro-${macro}-${indice}`,
    name: micro,
    type: 'MICRO' as const,
  })),
}));

const perfil = {
  email: MOCK_USER_TYPE === 'BUSINESS' ? 'contato@quierocafe.com' : 'rafaela.souza@email.com',
  pessoa: {
    name: 'Rafaela Souza',
    description: 'Organizo rolês de trilha e brunch em Porto Alegre. Sempre topo conhecer gente nova nos eventos.' as
      | string
      | null,
    date_of_birth: '1998-03-14',
    state: 'RS',
    city: 'Porto Alegre',
  },
  estabelecimento: {
    user_id: 'me',
    business_name: 'Quiero Café',
    cnpj: '12345678000199',
    description: 'Cafeteria de especialidade na Cidade Baixa.',
    address: 'Rua João Alfredo, 480',
    location: { latitude: -30.0401, longitude: -51.2219 },
    phone: '5133330000',
    instagram: '@quierocafe',
  },
  tagIds: ['micro-0-0', 'micro-0-1', 'micro-1-0', 'micro-5-0', 'micro-2-0'],
};

function tagsDoUsuario() {
  return {
    tags: ARVORE_DE_TAGS.flatMap((macro) =>
      macro.children
        .filter((micro) => perfil.tagIds.includes(micro.id))
        .map((micro) => ({ id: micro.id, name: micro.name, parent: { id: macro.id, name: macro.name } })),
    ),
  };
}

/** Rotas de perfil. Devolve `undefined` quando a rota não é daqui. */
function resolverPerfil(partes: string[], method: string, init: RequestInit): { resposta: unknown } | undefined {
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const rota = partes.join('/');

  if (rota === 'tags/tree' && method === 'GET') return { resposta: ARVORE_DE_TAGS };

  if (rota === 'users/me' && method === 'GET') {
    // Mesmo formato do `CurrentUserOutput` do backend.
    const { pessoa, estabelecimento } = perfil;
    return {
      resposta: {
        id: 'me',
        email: perfil.email,
        user_type: MOCK_USER_TYPE,
        name: MOCK_USER_TYPE === 'BUSINESS' ? estabelecimento.business_name : pessoa.name,
        profile:
          MOCK_USER_TYPE === 'BUSINESS'
            ? {
                cnpj: estabelecimento.cnpj,
                address: estabelecimento.address,
                latitude: estabelecimento.location.latitude,
                longitude: estabelecimento.location.longitude,
                photo_url: null,
              }
            : { date_of_birth: pessoa.date_of_birth, state: pessoa.state, city: pessoa.city, photo_url: null },
      },
    };
  }
  // Exclusão de conta, confirmada com a senha. Cenários de erro, pela senha
  // enviada: `errada...` -> 403 (senha incorreta), `boom...` -> 500.
  if (rota === 'users/me' && method === 'DELETE') {
    if (typeof body.password !== 'string' || body.password.length === 0 || body.password.startsWith('errada')) {
      throw new MockApiError(403, 'Incorrect password');
    }
    if (body.password.startsWith('boom')) throw new MockApiError(500, 'Internal server error');
    return { resposta: undefined };
  }

  if (rota === 'users/me/tags' && method === 'GET') return { resposta: tagsDoUsuario() };
  if (rota === 'users/me/tags' && method === 'PUT') {
    if (!Array.isArray(body.tag_ids) || body.tag_ids.length === 0) {
      throw new MockApiError(400, 'At least one tag is required');
    }
    perfil.tagIds = body.tag_ids;
    return { resposta: tagsDoUsuario() };
  }

  const ehPessoa = rota === 'users/me/profile';
  const ehEstabelecimento = rota === 'businesses/me';
  if (!ehPessoa && !ehEstabelecimento) return undefined;

  if (ehPessoa && MOCK_USER_TYPE !== 'PERSONAL') throw new MockApiError(403, 'Not a personal profile');
  if (ehEstabelecimento && MOCK_USER_TYPE !== 'BUSINESS') throw new MockApiError(403, 'Not a business profile');

  if (ehPessoa) {
    const { pessoa } = perfil;

    // Mesmo envelope do `UserProfileOutput` do backend.
    if (method === 'GET') {
      return {
        resposta: {
          profile: {
            id: 'me',
            name: pessoa.name,
            description: pessoa.description,
            photo_url: null,
            tags: tagsDoUsuario().tags.map(({ id, name }) => ({ id, name })),
            connections_count: 0,
          },
          counts: { past: 0, confirmed: 0, photos: 0 },
        },
      };
    }

    if (method === 'PATCH') {
      if (typeof body.description === 'string' && body.description.length > 500) {
        throw new MockApiError(400, 'Description exceeds maximum length');
      }
      // Como o `UserProfileUpdateInput` (`extra="ignore"`): só estes quatro
      // campos são gravados, o resto é ignorado sem erro.
      if (typeof body.name === 'string') pessoa.name = body.name;
      if ('description' in body) pessoa.description = body.description;
      if (typeof body.state === 'string') pessoa.state = body.state;
      if (typeof body.city === 'string') pessoa.city = body.city;
      return {
        resposta: {
          id: 'me',
          name: pessoa.name,
          description: pessoa.description,
          city: pessoa.city,
          updated_at: new Date().toISOString(),
        },
      };
    }

    return undefined;
  }

  const dados: Record<string, unknown> = perfil.estabelecimento;

  if (method === 'GET') return { resposta: { ...dados, email: perfil.email } };

  if (method === 'PATCH') {
    // Cenários de erro, pelo e-mail enviado: `usado@...` -> 409, `boom@...` -> 500.
    if (typeof body.email === 'string' && body.email.startsWith('usado@')) {
      throw new MockApiError(409, 'Email is already registered');
    }
    if (typeof body.email === 'string' && body.email.startsWith('boom@')) {
      throw new MockApiError(500, 'Internal server error');
    }
    if (typeof body.description === 'string' && body.description.length > 500) {
      throw new MockApiError(400, 'Description exceeds maximum length');
    }

    const { email, password: _password, ...campos } = body;
    if (typeof email === 'string') perfil.email = email;
    Object.assign(dados, campos);
    return { resposta: { ...dados, updated_at: new Date().toISOString() } };
  }

  return undefined;
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

  const respostaDePerfil = resolverPerfil(partes, method, init);
  // Por cima da resposta do PR #62 (TID072), que vem zerada: os contadores
  // seguem `EXPO_PUBLIC_MOCK_OWN_PROFILE`, como as abas e as fotos do dono.
  if (respostaDePerfil && partes.join('/') === 'users/me/profile' && method === 'GET') {
    if (cenarioPerfilProprio === 'profile-error') throw new MockApiError(500, 'Internal server error');
    if (cenarioPerfilProprio === 'profile-flaky') {
      const chamadas = (db.chamadasDeUsuario['perfil-proprio'] ?? 0) + 1;
      db.chamadasDeUsuario['perfil-proprio'] = chamadas;
      if (chamadas > 1) throw new MockApiError(500, 'Internal server error');
    }
    contarChamadaDoPhotosGrow('contadores');
    const resposta = respostaDePerfil.resposta as PersonalProfileResponse;
    const { connections_count, counts } = contadoresDoDono();
    return { profile: { ...resposta.profile, connections_count }, counts } as T;
  }
  if (respostaDePerfil) return respostaDePerfil.resposta as T;

  // Não é um endpoint de evento, mas a task 212 [BE] (`GET /terms/current`)
  // também ainda não subiu — o cadastro (task 056) precisa disto pra dar de
  // testar a etapa de aceite dos termos sem backend.
  if (partes[0] === 'terms' && partes[1] === 'current' && method === 'GET') {
    return {
      version: '2026-08-01',
      published_at: '2026-08-01T00:00:00Z',
      url: 'https://hangy.app/termos/2026-08-01',
      summary: 'Termos de uso e política de privacidade do Hangy.',
    } as T;
  }

  if (partes[0] === 'events' && partes.length === 2 && method === 'GET') {
    erroDoCenario(eventId);
    return detalhe(eventId) as T;
  }

  if (partes[0] === 'events' && partes.length === 2 && method === 'PATCH') {
    if (eventId === 'finished') throw new MockApiError(409, 'Event already finished');

    const body = init.body ? JSON.parse(String(init.body)) : {};
    // Os campos de local só vêm quando o endereço mudou; sem eles, vale o
    // que o evento já tinha.
    const atual = detalhe(eventId);
    db.overrides = {
      title: body.title,
      description: body.description ?? null,
      cover_photo_url: body.cover_photo_url ?? null,
      event_date: body.event_date,
      end_date: body.end_date,
      location: body.location ?? atual.location,
      location_name: body.location ? (body.location_name ?? null) : atual.location_name,
      tag_ids: body.tag_ids ?? [],
    };

    return {
      event_id: eventId,
      title: db.overrides.title,
      event_date: db.overrides.event_date,
      status: db.cancelled ? 'CANCELLED' : 'PUBLISHED',
      updated_at: new Date().toISOString(),
    } as T;
  }

  if (partes[0] === 'events' && partes[2] === 'participants' && partes.length === 3) {
    erroDoCenario(eventId);
    const statusFiltro = new URLSearchParams(path.split('?')[1] ?? '').get('status');
    return participantes(eventId, statusFiltro) as T;
  }

  if (partes[0] === 'events' && partes[2] === 'share' && partes.length === 3 && method === 'GET') {
    erroCompartilhar(eventId);
    return compartilhar(eventId) as T;
  }

  if (partes[0] === 'events' && partes[2] === 'cancel' && method === 'PATCH') {
    if (eventId === 'finished') throw new MockApiError(409, 'Event already finished');

    // Espelha o `CancelEventInput` do backend: `reason` obrigatório, 1-1000 caracteres.
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (reason.length < 1 || reason.length > 1000) {
      throw new MockApiError(422, 'Invalid cancellation reason');
    }

    db.cancelled = true;
    return { event_id: eventId, status: 'CANCELLED', updated_at: new Date().toISOString() } as T;
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

  if (partes[0] === 'users' && partes[1] === 'me' && partes[2] === 'photos' && partes.length === 3 && method === 'GET') {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const cursor = params.get('cursor');
    if (cenarioPerfilProprio === 'error' && !cursor) throw new MockApiError(500, 'Internal server error');
    if (cenarioPerfilProprio === 'error-page' && cursor) throw new MockApiError(500, 'Internal server error');

    const limite = Number(params.get('limit') ?? LIMITE_PADRAO_DE_FOTOS);
    const inicio = cursor ? Number(cursor) : 0;
    if (!Number.isInteger(limite) || limite < 1 || limite > 100 || !Number.isInteger(inicio) || inicio < 0) {
      throw new MockApiError(400, 'Invalid pagination parameters');
    }

    // Só a primeira página conta: o "Ver mais" continua a mesma lista.
    if (!cursor) contarChamadaDoPhotosGrow('fotos');
    const todas = fotosDoPerfilProprio();
    const items = todas.slice(inicio, inicio + limite);
    const fim = inicio + items.length;
    return { items, next_cursor: fim < todas.length ? String(fim) : null } as T;
  }

  // `me` é o usuário logado, não um perfil visitado: fica fora destas regras,
  // menos nas abas de eventos, em que é o dono.
  const ehAbasDoDono = partes[1] === 'me' && partes[2] === 'events' && partes.length === 3;
  if (partes[0] === 'users' && (partes[1] !== 'me' || ehAbasDoDono) && method === 'GET') {
    const userId = partes[1] ?? '';

    if (partes.length === 2) {
      await erroDoUsuario(userId, 'perfil');
      return perfil(userId) as T;
    }

    if (partes.length === 3 && partes[2] === 'events') {
      const ehDono = userId === 'me';
      if (!ehDono) {
        await erroDoUsuario(userId, 'eventos');
        if (userId === 'events-boom') throw new MockApiError(500, 'Internal server error');
      }

      const params = new URLSearchParams(path.split('?')[1] ?? '');
      const tab = params.get('tab');
      const cursor = params.get('cursor');
      const limite = Number(params.get('limit') ?? LIMITE_PADRAO_DE_EVENTOS);
      const abasPermitidas = ehDono ? ABAS_DO_DONO : ABAS_DE_VISITANTE;
      if ((tab === null) !== (cursor === null)) throw new MockApiError(400, 'Invalid tab');
      if (tab !== null && !abasPermitidas.some((aba) => aba === tab)) throw new MockApiError(400, 'Invalid tab');
      if (!Number.isInteger(limite) || limite < 1 || limite > 100 || (cursor !== null && !/^\d+$/.test(cursor))) {
        throw new MockApiError(400, 'Invalid pagination parameters');
      }
      if (userId === 'events-page-boom' && cursor !== null) throw new MockApiError(500, 'Internal server error');
      if (ehDono && cenarioPerfilProprio === 'error' && cursor === null) {
        throw new MockApiError(500, 'Internal server error');
      }
      if (ehDono && cenarioPerfilProprio === 'error-page' && cursor !== null) {
        throw new MockApiError(500, 'Internal server error');
      }
      // A recarga por foco falha com um "Ver mais" ainda em voo.
      if (ehDono && cenarioPerfilProprio === 'own-events-flaky') {
        if (cursor !== null) {
          await wait(VER_MAIS_LENTO_MS);
        } else {
          const chamadas = (db.chamadasDeUsuario['eventos-do-dono'] ?? 0) + 1;
          db.chamadasDeUsuario['eventos-do-dono'] = chamadas;
          if (chamadas > 1) throw new MockApiError(500, 'Internal server error');
        }
      }

      const eventos = (aba: UserEventsTab) => {
        if (ehDono) return eventosDoDono(aba);
        return aba === 'history' || aba === 'created' ? eventosDaAba(userId, aba) : [];
      };
      const pagina = (aba: UserEventsTab) =>
        abasPermitidas.includes(aba) && (tab === null || tab === aba)
          ? paginaDeEventos(eventos(aba), cursor, limite)
          : null;
      const abas: UserEventsTabs = {
        history: pagina('history'),
        created: pagina('created'),
        interests: pagina('interests'),
        confirmed: pagina('confirmed'),
      };
      return abas as T;
    }
  }

  if (partes[0] === 'connections' && partes.length === 1 && method === 'POST') {
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const receiverId: string = body.receiver_id ?? '';
    const destinatario = perfil(receiverId);

    // Estabelecimento cai no mesmo 404 de inexistente, como no backend.
    if (db.usuariosIndisponiveis.includes(receiverId) || destinatario.user_type === 'BUSINESS') {
      throw new MockApiError(404, 'User not found');
    }
    if (receiverId === 'connect-boom') throw new MockApiError(500, 'Internal server error');
    if (receiverId === 'connect-gone') {
      db.usuariosIndisponiveis.push(receiverId);
      throw new MockApiError(404, 'User not found');
    }
    if (receiverId === 'connect-conflict') {
      atualizarRelacao(receiverId, { connection_status: 'PENDING' });
      throw new MockApiError(409, 'Connection already exists');
    }
    if (destinatario.connection_status !== null) {
      throw new MockApiError(409, 'Connection already exists');
    }

    atualizarRelacao(receiverId, { connection_status: 'PENDING' });
    const resultado: ConnectionRequestResult = {
      connection_id: `conexao-${receiverId}`,
      requester_id: 'usuario-logado',
      receiver_id: receiverId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    return resultado as T;
  }

  if (partes[0] === 'users' && partes[2] === 'block' && partes.length === 3 && method === 'POST') {
    const userId = partes[1] ?? '';
    if (userId === 'block-boom') throw new MockApiError(500, 'Internal server error');
    if (userId === 'block-gone' || db.usuariosIndisponiveis.includes(userId)) {
      db.usuariosIndisponiveis.push(userId);
      throw new MockApiError(404, 'User not found');
    }

    db.usuariosIndisponiveis.push(userId);
    if (userId === 'block-already') throw new MockApiError(409, 'User already blocked');
    return undefined as T;
  }

  if (partes[0] === 'businesses' && partes[2] === 'follow' && partes.length === 3) {
    const businessId = partes[1] ?? '';
    if (db.usuariosIndisponiveis.includes(businessId)) {
      throw new MockApiError(404, 'Business not found');
    }
    const estabelecimento = perfil(businessId);
    const ehEstabelecimento = estabelecimento.user_type === 'BUSINESS';

    if (method === 'POST') {
      if (!ehEstabelecimento) throw new MockApiError(403, 'Target is not a business profile');
      if (businessId === 'business-boom') throw new MockApiError(500, 'Internal server error');
      if (businessId === 'follow-gone') {
        db.usuariosIndisponiveis.push(businessId);
        throw new MockApiError(404, 'Business not found');
      }
      if (!estabelecimento.is_following) {
        atualizarRelacao(businessId, {
          is_following: true,
          connections_count: estabelecimento.connections_count + 1,
        });
      }
      return undefined as T;
    }

    if (method === 'DELETE') {
      if (!ehEstabelecimento) throw new MockApiError(404, 'Business not found');
      if (businessId === 'following-boom') throw new MockApiError(500, 'Internal server error');
      if (businessId === 'unfollow-gone') {
        db.usuariosIndisponiveis.push(businessId);
        throw new MockApiError(404, 'Business not found');
      }
      if (estabelecimento.is_following) {
        atualizarRelacao(businessId, {
          is_following: false,
          connections_count: estabelecimento.connections_count - 1,
        });
      }
      return undefined as T;
    }
  }

  throw new MockApiError(404, 'Not found');
}
