import type {
  EventDetail,
  EventParticipant,
  EventParticipantItem,
  EventShare,
  ParticipantsPage,
} from '@/types/event';
import type { PersonalProfileResponse } from '@/types/profile';
import type {
  ConnectionAnswerResult,
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
 * `GET /events/nearby` (mapa Ao Vivo, task 119 [BE]) também mora aqui — ver
 * `EVENTOS_PROXIMOS` para os cenários do mapa.
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
 * | `favorite-*` | Igual a `guest`, com erro só ao favoritar (veja "Favoritar") |
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
 * conta logada (`conta-mock`), vêm as quatro abas do dono, com privados (veja abaixo).
 *
 * Conectar (`POST /connections`), responder (`PATCH /connections/{id}`),
 * cancelar ou desfazer (`DELETE /connections/{id}`), seguir (`POST`/`DELETE
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
 * O perfil traz os campos da task 281 [BE] (`connection_id`,
 * `connection_direction` e, no estabelecimento, `followers_count`), menos nos
 * cenários `-legacy`, que imitam o backend de antes dela. Conectar devolve o
 * `connection_id` e passa a PENDING enviada (`SENT`). O sufixo `-noname` tira o
 * nome de qualquer cenário (`pending-noname`).
 *
 * | `user_id`          | Perfil                       | Ação                                               |
 * | ------------------ | ---------------------------- | -------------------------------------------------- |
 * | `pending`          | Solicitação enviada          | Cancelar: `204`, volta a sem conexão               |
 * | `connected`        | Conectada, 8 conexões        | Desfazer: `204`, sem conexão, −1                   |
 * | `received`         | Solicitação recebida         | Confirmar: `200`, conectada, +1; recusar: `200`    |
 * | `answer-boom`      | Solicitação recebida         | Responder: `500`                                   |
 * | `answer-conflict`  | Solicitação recebida         | Responder: `409`, o GET seguinte vem conectada     |
 * | `answer-gone`      | Solicitação recebida         | Responder: `404`, o GET seguinte vem sem conexão   |
 * | `cancel-boom`      | Solicitação enviada          | Cancelar: `500`                                    |
 * | `undo-boom`        | Conectada                    | Desfazer: `500`                                    |
 * | `cancel-gone`      | Solicitação enviada          | Cancelar: `404`, o GET seguinte vem sem conexão    |
 * | `undo-gone`        | Conectada                    | Desfazer: `404`, o GET seguinte vem sem conexão    |
 * | `undo-forbidden`   | Conectada                    | Desfazer: `403`, o GET seguinte vem sem conexão    |
 * | `pending-legacy`   | Solicitação enviada, sem 281 | Nenhuma                                            |
 * | `connected-legacy` | Conectada, sem 281           | Nenhuma                                            |
 * | `business-legacy`  | Estabelecimento, sem 281     | Seguir: `204`, +1                                  |
 *
 * Perfil próprio (`GET /users/me/photos`, `GET /users/conta-mock/events` e os
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
 * O id da conta é `conta-mock`, e não `me`, para o perfil próprio
 * (`GET /users/conta-mock`) e o usuário logado (`GET /users/me`, do
 * `useCurrentUser`) serem rotas diferentes. Cada cenário conta só as chamadas
 * da própria rota; o `GET /users/me` do `useCurrentUser` (de qualquer tela,
 * inclusive o EventDetail) não entra mais na contagem.
 *
 * Com `EXPO_PUBLIC_MOCK_USER_TYPE=BUSINESS`, o perfil comercial lê o
 * `GET /users/conta-mock`: 1204 seguidores (0 em `empty`). As abas do dono são
 * `history` e `created`, como as de quem visita. Nessa rota, `profile-error`
 * responde `500` sempre e `profile-flaky`, a partir da 2ª chamada. A leitura do
 * Editar perfil (`GET /businesses/me`) não falha.
 *
 * O `/UserProfile?id=conta-mock` chama o `GET /users/conta-mock/events` antes de
 * redirecionar para o Perfil, e em conta de estabelecimento também o
 * `GET /users/conta-mock`: ele gasta a 1ª carga de `own-events-flaky` e a 1ª
 * chamada de `profile-flaky`. Nesses cenários, abrir o Perfil antes.
 *
 * Usuários bloqueados (`GET /users/me/blocked` e `DELETE /users/{id}/block`):
 * o cenário vem de `EXPO_PUBLIC_MOCK_BLOCKED`, lida quando o Metro inicia.
 * Desbloquear tira a pessoa do `GET` seguinte; recarregar o app desfaz.
 *
 * | Valor           | Lista                                                   |
 * | --------------- | ------------------------------------------------------- |
 * | `full` (padrão) | 25 pessoas, em duas páginas com o `limit` da tela (20)  |
 * | `empty`         | Lista vazia                                             |
 * | `error`         | `500` na primeira página                                |
 * | `error-page`    | Primeira página OK, `500` na seguinte                   |
 *
 * | `user_id`        | Desbloquear                                    |
 * | ---------------- | ---------------------------------------------- |
 * | qualquer pessoa  | `204`, sai da lista                            |
 * | `unblock-gone`   | `404` (já desbloqueada), sai da lista          |
 * | `unblock-boom`   | `500`                                          |
 *
 * `offline` simula só a falha de rede da requisição. O `OfflineBanner` e o
 * botão de relacionamento desabilitado dependem do estado real da rede
 * (modo avião).
 *
 * ## Favoritar (`POST`/`DELETE /events/{id}/favorite`)
 *
 * Os dois respondem `204` e são idempotentes, como no backend, e alteram o
 * `viewer.is_favorited` do detalhe e a aba Interesses do dono, que saem da mesma
 * lista. Ela começa com `samba-cidade-baixa` e `brique-redencao` (vazia em
 * `empty`); um favorito fora desses dois entra na aba com os dados do detalhe.
 * Conta de estabelecimento recebe `403`, e evento cancelado, `404`; o favorito
 * feito antes do cancelamento sai da aba.
 *
 * Nos cenários abaixo o detalhe carrega como o de `guest`, na visão de visitante:
 *
 * | `event_id`           | Favoritar ou desfavoritar                           |
 * | -------------------- | --------------------------------------------------- |
 * | `favorite-gone`      | `404`, e o GET seguinte do detalhe também vem `404` |
 * | `favorite-boom`      | `500`                                               |
 * | `favorite-forbidden` | `403`                                               |
 * | `favorite-offline`   | Falha de rede                                       |
 * | `favorite-slow`      | Timeout, após `API_TIMEOUT_MS`                      |
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

type CenarioBloqueados = 'full' | 'empty' | 'error' | 'error-page';
const CENARIOS_BLOQUEADOS: readonly string[] = ['full', 'empty', 'error', 'error-page'];
const valorDoCenarioBloqueados = process.env.EXPO_PUBLIC_MOCK_BLOCKED;
const cenarioBloqueados: CenarioBloqueados =
  valorDoCenarioBloqueados && CENARIOS_BLOQUEADOS.includes(valorDoCenarioBloqueados)
    ? (valorDoCenarioBloqueados as CenarioBloqueados)
    : 'full';

const NOMES_BLOQUEADOS = [
  'Bruno Lima', 'Carla Menezes', 'Diego Arruda', 'Elisa Cardoso', 'Fábio Nunes',
  'Gabriela Torres', 'Henrique Sales', 'Isadora Pires', 'João Batista', 'Karen Moura',
  'Leonardo Faria', 'Mariana Castro', 'Nathalia Rocha', 'Otávio Mendes', 'Paula Ribeiro',
  'Quésia Barros', 'Rafael Antunes', 'Sabrina Costa', 'Tiago Moreira', 'Úrsula Campos',
  'Vinícius Prado', 'Wesley Dias',
];

function bloqueadosIniciais() {
  if (cenarioBloqueados === 'empty') return [];
  const dia = 24 * 60 * 60 * 1000;
  const pessoas = NOMES_BLOQUEADOS.map((name, index) => ({
    user_id: `blocked-${index + 1}`,
    name,
    photo_url: index % 3 === 0 ? null : `https://picsum.photos/seed/blocked-${index + 1}/150`,
    blocked_at: new Date(Date.now() - (index + 1) * dia).toISOString(),
  }));
  return [
    { user_id: 'unblock-gone', name: 'Pessoa já desbloqueada', photo_url: null, blocked_at: new Date().toISOString() },
    { user_id: 'unblock-boom', name: 'Pessoa com erro no servidor', photo_url: null, blocked_at: new Date().toISOString() },
    ...pessoas,
    { user_id: 'blocked-long-name', name: 'Maria Eduarda Albuquerque de Vasconcelos Figueiredo', photo_url: null, blocked_at: new Date(Date.now() - 40 * dia).toISOString() },
  ];
}

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
    /** `GET /users/me/blocked`, na ordem da lista; nunca encolhe, para o cursor continuar valendo. */
    bloqueados: bloqueadosIniciais(),
    /** Quem já foi desbloqueado: some do `GET` seguinte. */
    desbloqueados: [] as string[],
    // Fonte do `is_favorited` e da aba Interesses do dono. Os ids iniciais repetem
    // os de `EVENTOS_DE_INTERESSE_DO_DONO` porque `db` nasce antes de a constante
    // ser declarada; nenhum em `empty`.
    favoritos: cenarioPerfilProprio === 'empty' ? [] : ['samba-cidade-baixa', 'brique-redencao'],
    eventosIndisponiveis: [] as string[],
    // `cancelled` vale para o mock inteiro; o favoritar só responde `404` para o evento cancelado.
    eventosCancelados: [] as string[],
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
  ancoraDoMapa = null;
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

/** Erros só no favoritar, com o detalhe igual ao de `guest`: visitante, o caso principal do favoritar. */
const CENARIOS_DE_FAVORITAR = ['favorite-gone', 'favorite-boom', 'favorite-forbidden', 'favorite-offline', 'favorite-slow'];

const ehVisitanteDeEventoPublico = (eventId: string) => eventId === 'guest' || CENARIOS_DE_FAVORITAR.includes(eventId);

const ehVisitante = (eventId: string) => ehVisitanteDeEventoPublico(eventId) || CENARIOS_PRIVADOS.includes(eventId);

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
    privacy: ehPrivado ? 'PRIVATE' : ehVisitanteDeEventoPublico(eventId) ? 'PUBLIC' : 'INVITE_ONLY',
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
      is_favorited: db.favoritos.includes(eventId),
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

/**
 * Eventos do `GET /events/nearby` (tasks 118 e 274). Ficam a uma distância fixa
 * de uma âncora, não num endereço — assim aparecem onde quer que o mapa abra
 * (Porto Alegre, posição do simulador, etc.). A âncora é o centro da primeira
 * busca e não acompanha as seguintes: senão cada pan/zoom (que refaz a busca)
 * moveria os pins junto, e o pin "fugiria" ao ser centralizado. Só muda se a
 * busca for para longe (`DISTANCIA_PARA_REANCORAR_M`), ex.: o GPS chegou depois
 * da busca na posição padrão. Cada `event_id` é um dos cenários do detalhe,
 * então tocar no preview abre o detalhe coerente.
 *
 * | `event_id`          | No mapa                                                   |
 * | ------------------- | --------------------------------------------------------- |
 * | `guest`             | Público, pin normal, botão de confirmar presença           |
 * | `private`           | Privado não aprovado: selo de cadeado, área de 500 m       |
 * | `private-no-area`   | Igual, sem bairro: preview com "Local aproximado"          |
 * | `private-confirmed` | Privado já aprovado: `EXACT`, pin normal, sem selo nem área |
 * | `sem-precisao`      | Sem `location_precision` (backend antigo): conta como `EXACT` |
 *
 * Os eventos ficam entre ~400 m e ~900 m da âncora: com zoom bem fechado longe
 * deles o raio da busca não os alcança e cai no estado vazio do mapa.
 */
const EVENTOS_PROXIMOS: {
  event_id: string;
  title: string;
  /** Deslocamento em metros a partir do centro da busca (norte e leste positivos). */
  norte: number;
  leste: number;
  location_name: string | null;
  location_precision?: 'EXACT' | 'APPROXIMATE';
  privacy: 'PUBLIC' | 'PRIVATE';
  is_confirmed: boolean;
}[] = [
  { event_id: 'guest', title: 'Show no Opinião', norte: 450, leste: -350, location_name: 'Bar Opinião', location_precision: 'EXACT', privacy: 'PUBLIC', is_confirmed: false },
  { event_id: 'private', title: 'Futebol no Planet', norte: -300, leste: 500, location_name: 'Jardim Botânico, Porto Alegre', location_precision: 'APPROXIMATE', privacy: 'PRIVATE', is_confirmed: false },
  { event_id: 'private-no-area', title: 'Aniversário surpresa', norte: -700, leste: -400, location_name: null, location_precision: 'APPROXIMATE', privacy: 'PRIVATE', is_confirmed: false },
  { event_id: 'private-confirmed', title: 'Churrasco da turma', norte: 600, leste: 550, location_name: 'Rua Tenente-Coronel Fabrício Pilar, 520', location_precision: 'EXACT', privacy: 'PRIVATE', is_confirmed: true },
  { event_id: 'sem-precisao', title: 'Feira do Bom Fim', norte: 150, leste: -850, location_name: 'Parque da Redenção', privacy: 'PUBLIC', is_confirmed: false },
];

const METROS_POR_GRAU = 111320;
const DISTANCIA_PARA_REANCORAR_M = 20000;

/** Centro da primeira busca — onde os eventos do mapa ficam presos. */
let ancoraDoMapa: { latitude: number; longitude: number } | null = null;

/** Distância aproximada em metros (equirretangular) — basta para o mock. */
function distanciaEmMetros(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const norte = (b.latitude - a.latitude) * METROS_POR_GRAU;
  const leste = (b.longitude - a.longitude) * METROS_POR_GRAU * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(norte, leste);
}

function eventosProximos(path: string) {
  const params = new URLSearchParams(path.split('?')[1] ?? '');
  const latitude = Number(params.get('latitude'));
  const longitude = Number(params.get('longitude'));
  const raio = Number(params.get('radius_m'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new MockApiError(422, 'Invalid coordinates');
  }
  if (raio > 50000) throw new MockApiError(422, 'Radius exceeds maximum');

  const centro = { latitude, longitude };
  if (!ancoraDoMapa || distanciaEmMetros(ancoraDoMapa, centro) > DISTANCIA_PARA_REANCORAR_M) {
    ancoraDoMapa = centro;
  }
  const ancora = ancoraDoMapa;
  const metrosPorGrauDeLongitude = METROS_POR_GRAU * Math.cos((ancora.latitude * Math.PI) / 180);
  const items = EVENTOS_PROXIMOS.map((evento) => {
    const aproximado = evento.location_precision === 'APPROXIMATE';
    const location = {
      latitude: ancora.latitude + evento.norte / METROS_POR_GRAU,
      longitude: ancora.longitude + evento.leste / metrosPorGrauDeLongitude,
    };
    // Até o centro da busca, como no backend (não até a âncora).
    const distancia = distanciaEmMetros(centro, location);
    return {
      event_id: evento.event_id,
      title: evento.title,
      event_date: '2026-10-30T19:00:00Z',
      location,
      location_name: evento.location_name,
      ...(evento.location_precision ? { location_precision: evento.location_precision } : {}),
      location_radius_m: aproximado ? 500 : null,
      privacy: evento.privacy,
      cover_photo_url: `https://picsum.photos/seed/hangy-${evento.event_id}/300/300`,
      // Igual ao backend: distância de evento aproximado já vem arredondada.
      distance_m: aproximado ? Math.round(distancia / 100) * 100 : Math.round(distancia),
      participants_count: aproximado ? null : 12,
      is_confirmed: evento.is_confirmed,
    };
  }).filter((item) => item.distance_m <= raio);

  return { items };
}

/** `/events/aa11/participants/p11` -> `['events', 'aa11', 'participants', 'p11']` */
function segmentos(path: string) {
  return path.split('?')[0].split('/').filter(Boolean);
}

function erroDoCenario(eventId: string) {
  if (eventId === 'cancelled') throw new MockApiError(410, 'Event was cancelled');
  if (eventId === 'missing' || db.eventosIndisponiveis.includes(eventId)) {
    throw new MockApiError(404, 'Event not found');
  }
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

/**
 * Como o backend, favoritar responde `404` também para o evento cancelado, em
 * vez do `410` do `GET /events/{id}`.
 */
async function erroFavoritar(eventId: string) {
  if (MOCK_USER_TYPE === 'BUSINESS') throw new MockApiError(403, 'Only personal accounts can favorite events');
  if (db.eventosCancelados.includes(eventId) || db.eventosIndisponiveis.includes(eventId)) {
    throw new MockApiError(404, 'Event not found');
  }
  if (eventId === 'favorite-gone') {
    db.eventosIndisponiveis.push(eventId);
    throw new MockApiError(404, 'Event not found');
  }
  if (eventId === 'favorite-boom') throw new MockApiError(500, 'Internal server error');
  if (eventId === 'favorite-forbidden') throw new MockApiError(403, 'Only personal accounts can favorite events');
  if (eventId === 'favorite-offline') throw new MockNetworkError();
  if (eventId === 'favorite-slow') {
    await wait(API_TIMEOUT_MS);
    throw new MockTimeoutError();
  }
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
  Pick<
    UserProfile,
    | 'connection_status'
    | 'connection_id'
    | 'connection_direction'
    | 'is_following'
    | 'connections_count'
    | 'followers_count'
  >
>;

const ESTABELECIMENTOS = new Set([
  'business',
  'following',
  'business-boom',
  'following-boom',
  'follow-gone',
  'unfollow-gone',
  'one-follower',
  'business-legacy',
]);
const SEGUIDOS_DE_INICIO = new Set(['following', 'following-boom', 'unfollow-gone']);
const SEGUIDORES_INICIAIS = 1204;
/** Contadores no singular, para conferir "1 Conexão" e "1 Seguidor". */
const CONTAGEM_INICIAL: Record<string, number> = { 'one-connection': 1, 'one-follower': 1 };

const SOLICITACOES_ENVIADAS = new Set(['pending', 'cancel-boom', 'cancel-gone', 'pending-legacy']);
const SOLICITACOES_RECEBIDAS = new Set(['received', 'answer-boom', 'answer-conflict', 'answer-gone']);
const CONECTADOS = new Set(['connected', 'undo-boom', 'undo-gone', 'undo-forbidden', 'connected-legacy']);
/** Sem os campos da task 281 [BE], como o backend de antes dela. */
const SEM_CAMPOS_DA_281 = new Set(['pending-legacy', 'connected-legacy', 'business-legacy']);
const SUFIXO_SEM_NOME = '-noname';
const SEM_CONEXAO: RelacaoDoUsuario = { connection_status: null, connection_id: null, connection_direction: null };

function statusDeConexaoInicial(cenario: string): UserProfile['connection_status'] {
  if (SOLICITACOES_ENVIADAS.has(cenario) || SOLICITACOES_RECEBIDAS.has(cenario)) return 'PENDING';
  if (CONECTADOS.has(cenario)) return 'CONFIRMED';
  if (cenario === 'rejected') return 'REJECTED';
  return null;
}

/** O id da conexão leva o do perfil, para o `PATCH` e o `DELETE` acharem a relação. */
function idDaConexao(userId: string) {
  return `conexao-${userId}`;
}

function perfilDaConexao(connectionId: string) {
  const prefixo = idDaConexao('');
  if (!connectionId.startsWith(prefixo)) return null;
  const perfil = perfilVisitado(connectionId.slice(prefixo.length));
  return perfil.connection_id === connectionId ? perfil : null;
}

/** Seguidores no `followers_count` da task 281 [BE]; sem ela, no `connections_count`. */
function mudancaDeSeguidores(estabelecimento: UserProfile, delta: number): RelacaoDoUsuario {
  return typeof estabelecimento.followers_count === 'number'
    ? { followers_count: estabelecimento.followers_count + delta }
    : { connections_count: estabelecimento.connections_count + delta };
}

function atualizarRelacao(userId: string, mudanca: RelacaoDoUsuario) {
  db.relacoesDeUsuario[userId] = { ...db.relacoesDeUsuario[userId], ...mudanca };
}

function perfilVisitado(userId: string): UserProfile {
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
      connection_id: null,
      connection_direction: null,
      followers_count: null,
      is_following: false,
      connections_count: 0,
    };
  }

  // O cenário sem o sufixo: `pending-noname` se comporta como `pending`.
  const semNome = userId.endsWith(SUFIXO_SEM_NOME);
  const cenario = semNome ? userId.slice(0, -SUFIXO_SEM_NOME.length) : userId;
  const ehEstabelecimento = ESTABELECIMENTOS.has(cenario);
  const segue = SEGUIDOS_DE_INICIO.has(cenario);
  const connectionStatus = ehEstabelecimento ? null : statusDeConexaoInicial(cenario);

  const perfil: UserProfile = {
    id: userId,
    user_type: ehEstabelecimento ? 'BUSINESS' : 'PERSONAL',
    name: semNome ? null : ehEstabelecimento ? 'DRY Moments' : 'Bruno Lima',
    description: ehEstabelecimento
      ? 'Bar e eventos na Cidade Baixa.'
      : 'Futebol aos sábados e trilha quando dá.',
    photo_url: 'https://picsum.photos/seed/hangy-perfil/300/300',
    tags: [
      { id: 't1', name: 'Esportes' },
      { id: 't2', name: 'Futebol' },
    ],
    connection_status: connectionStatus,
    is_following: segue,
    connections_count:
      CONTAGEM_INICIAL[cenario] ?? (ehEstabelecimento ? SEGUIDORES_INICIAIS + (segue ? 1 : 0) : 8),
  };
  if (SEM_CAMPOS_DA_281.has(cenario)) return perfil;

  const temConexao = connectionStatus === 'PENDING' || connectionStatus === 'CONFIRMED';
  return {
    ...perfil,
    connection_id: temConexao ? idDaConexao(userId) : null,
    connection_direction:
      connectionStatus === 'PENDING' ? (SOLICITACOES_RECEBIDAS.has(cenario) ? 'RECEIVED' : 'SENT') : null,
    followers_count: ehEstabelecimento ? perfil.connections_count : null,
    // Estabelecimento não se conecta: zerado, a tela que ler os seguidores do
    // campo errado mostra 0.
    ...(ehEstabelecimento && { connections_count: 0 }),
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

/** Itens dos favoritos iniciais; os demais favoritos saem do `detalhe()`. */
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

function itemDoDetalhe(eventId: string): UserEventItem {
  const evento = detalhe(eventId);
  return {
    event_id: evento.event_id,
    title: evento.title,
    event_date: evento.event_date,
    location_name: evento.location_name,
    cover_photo_url: evento.cover_photo_url,
    privacy: evento.privacy,
    participation_status: evento.viewer.participation_status,
  };
}

/**
 * Na ordem do backend: data crescente, com desempate pelo id. Como lá, o
 * favorito de um evento cancelado ou indisponível continua guardado, mas sai da lista.
 */
function interessesDoDono(): UserEventItem[] {
  return db.favoritos
    .filter((eventId) => !db.eventosCancelados.includes(eventId) && !db.eventosIndisponiveis.includes(eventId))
    .map((eventId) => EVENTOS_DE_INTERESSE_DO_DONO.find((evento) => evento.event_id === eventId) ?? itemDoDetalhe(eventId))
    .sort((a, b) => Date.parse(a.event_date) - Date.parse(b.event_date) || a.event_id.localeCompare(b.event_id));
}

function eventosDoDono(aba: UserEventsTab): UserEventItem[] {
  // Os favoritos já começam vazios em `empty`, e favoritar lá precisa aparecer.
  if (aba === 'interests') return interessesDoDono();
  if (cenarioPerfilProprio === 'empty') return [];
  if (aba === 'history') return historicoDoDono();
  if (aba === 'created') return EVENTOS_CRIADOS_DO_DONO;
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

/**
 * Perfil público da conta (`GET /users/{id da conta}`), lido do mesmo `perfil`
 * e das mesmas tags que o Editar perfil grava, para a volta da edição mostrar o
 * dado novo.
 */
function perfilPublicoDaConta(): UserProfile {
  const comum = {
    id: ID_DA_CONTA,
    photo_url: null,
    tags: tagsDoUsuario().tags.map(({ id, name }) => ({ id, name })),
    connection_status: null,
    connection_id: null,
    connection_direction: null,
    is_following: false,
  };

  if (MOCK_USER_TYPE === 'BUSINESS') {
    return {
      ...comum,
      user_type: 'BUSINESS',
      name: perfil.estabelecimento.business_name,
      description: perfil.estabelecimento.description,
      connections_count: 0,
      followers_count: cenarioPerfilProprio === 'empty' ? 0 : SEGUIDORES_INICIAIS,
    };
  }

  return {
    ...comum,
    user_type: 'PERSONAL',
    name: perfil.pessoa.name,
    description: perfil.pessoa.description,
    connections_count: contadoresDoDono().connections_count,
    followers_count: null,
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

/** Diferente de `me` para o `GET /users/{id}` próprio não cair no `GET /users/me`. */
const ID_DA_CONTA = 'conta-mock';

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
    user_id: ID_DA_CONTA,
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
        id: ID_DA_CONTA,
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
            id: ID_DA_CONTA,
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
          id: ID_DA_CONTA,
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

  if (partes.join('/') === 'users/me/blocked' && method === 'GET') {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const limit = Number(params.get('limit') ?? 20);
    // Cursor = último `user_id` da página anterior, e não um offset: desbloquear
    // alguém já carregado não pode empurrar a página seguinte e pular pessoas.
    const cursor = params.get('cursor');
    const depoisDe = cursor ? db.bloqueados.findIndex((pessoa) => pessoa.user_id === cursor) : -1;
    const ativos = (pessoas: typeof db.bloqueados) =>
      pessoas.filter((pessoa) => !db.desbloqueados.includes(pessoa.user_id));
    if (!Number.isInteger(limit) || limit < 1 || (cursor && depoisDe === -1)) {
      throw new MockApiError(400, 'Invalid pagination parameters');
    }
    if (cenarioBloqueados === 'error' || (cenarioBloqueados === 'error-page' && cursor)) {
      throw new MockApiError(500, 'Internal server error');
    }
    const restantes = ativos(db.bloqueados.slice(depoisDe + 1));
    const pagina = restantes.slice(0, limit);
    const temMais = restantes.length > limit;
    return {
      items: pagina,
      next_cursor: temMais ? pagina[pagina.length - 1].user_id : null,
    } as T;
  }

  if (partes[0] === 'users' && partes[2] === 'block' && partes.length === 3 && method === 'DELETE') {
    const userId = partes[1] ?? '';
    if (userId === 'unblock-boom') throw new MockApiError(500, 'Internal server error');
    const estavaBloqueado =
      db.bloqueados.some((pessoa) => pessoa.user_id === userId) && !db.desbloqueados.includes(userId);
    db.desbloqueados.push(userId);
    if (userId === 'unblock-gone' || !estavaBloqueado) throw new MockApiError(404, 'User not found');
    return undefined as T;
  }

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

  if (partes[0] === 'users' && partes[1] === ID_DA_CONTA && partes.length === 2 && method === 'GET') {
    // A pessoa física lê os contadores pelo `GET /users/me/profile`, que já
    // tem os cenários de erro; aqui eles valem só para o perfil comercial.
    if (MOCK_USER_TYPE === 'BUSINESS') {
      const chamadas = (db.chamadasDeUsuario['perfil-do-estabelecimento'] ?? 0) + 1;
      db.chamadasDeUsuario['perfil-do-estabelecimento'] = chamadas;
      if (cenarioPerfilProprio === 'profile-error') throw new MockApiError(500, 'Internal server error');
      if (cenarioPerfilProprio === 'profile-flaky' && chamadas > 1) {
        throw new MockApiError(500, 'Internal server error');
      }
    }
    return perfilPublicoDaConta() as T;
  }

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

  // Antes do detalhe: `/events/nearby` também tem dois segmentos.
  if (partes[0] === 'events' && partes[1] === 'nearby' && method === 'GET') {
    return eventosProximos(path) as T;
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
    db.eventosCancelados.push(eventId);
    return { event_id: eventId, status: 'CANCELLED', updated_at: new Date().toISOString() } as T;
  }

  if (partes[0] === 'events' && partes[2] === 'favorite' && partes.length === 3 && (method === 'POST' || method === 'DELETE')) {
    await erroFavoritar(eventId);
    const semEste = db.favoritos.filter((id) => id !== eventId);
    db.favoritos = method === 'POST' ? [...semEste, eventId] : semEste;
    return undefined as T;
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

  // `/users/me/...` são as rotas da conta logada, não um perfil visitado.
  if (partes[0] === 'users' && partes[1] !== 'me' && method === 'GET') {
    const userId = partes[1] ?? '';

    if (partes.length === 2) {
      await erroDoUsuario(userId, 'perfil');
      return perfilVisitado(userId) as T;
    }

    if (partes.length === 3 && partes[2] === 'events') {
      const ehDono = userId === ID_DA_CONTA;
      if (!ehDono) {
        await erroDoUsuario(userId, 'eventos');
        if (userId === 'events-boom') throw new MockApiError(500, 'Internal server error');
      }

      const params = new URLSearchParams(path.split('?')[1] ?? '');
      const tab = params.get('tab');
      const cursor = params.get('cursor');
      const limite = Number(params.get('limit') ?? LIMITE_PADRAO_DE_EVENTOS);
      // O estabelecimento dono recebe as mesmas abas de quem visita, como no backend.
      const abasPermitidas = ehDono && MOCK_USER_TYPE === 'PERSONAL' ? ABAS_DO_DONO : ABAS_DE_VISITANTE;
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
    const destinatario = perfilVisitado(receiverId);

    // Estabelecimento cai no mesmo 404 de inexistente, como no backend.
    if (db.usuariosIndisponiveis.includes(receiverId) || destinatario.user_type === 'BUSINESS') {
      throw new MockApiError(404, 'User not found');
    }
    if (receiverId === 'connect-boom') throw new MockApiError(500, 'Internal server error');
    if (receiverId === 'connect-gone') {
      db.usuariosIndisponiveis.push(receiverId);
      throw new MockApiError(404, 'User not found');
    }
    const enviada: RelacaoDoUsuario = {
      connection_status: 'PENDING',
      connection_id: idDaConexao(receiverId),
      connection_direction: 'SENT',
    };
    if (receiverId === 'connect-conflict') {
      atualizarRelacao(receiverId, enviada);
      throw new MockApiError(409, 'Connection already exists');
    }
    if (destinatario.connection_status !== null) {
      throw new MockApiError(409, 'Connection already exists');
    }

    atualizarRelacao(receiverId, enviada);
    const resultado: ConnectionRequestResult = {
      connection_id: idDaConexao(receiverId),
      requester_id: 'usuario-logado',
      receiver_id: receiverId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    return resultado as T;
  }

  // Tasks 230 e 231 [BE]. No `PATCH`, a ordem dos erros é a do service do
  // backend (404, 403, 409); como o mock não guarda quem recebeu depois da
  // resposta, o 409 de solicitação já respondida só sai em `answer-conflict`.
  if (partes[0] === 'connections' && partes.length === 2 && (method === 'PATCH' || method === 'DELETE')) {
    const connectionId = partes[1] ?? '';
    const pessoa = perfilDaConexao(connectionId);
    if (!pessoa) throw new MockApiError(404, 'Connection not found');
    const userId = pessoa.id;

    if (method === 'PATCH') {
      const body = init.body ? JSON.parse(String(init.body)) : {};
      if (body.status !== 'CONFIRMED' && body.status !== 'REJECTED') {
        throw new MockApiError(422, 'Invalid connection status');
      }
      if (pessoa.connection_direction !== 'RECEIVED') throw new MockApiError(403, 'Only the receiver can answer');
      if (userId === 'answer-boom') throw new MockApiError(500, 'Internal server error');
      // Respondida em outro lugar (ex.: Notificações) antes deste pedido chegar.
      if (userId === 'answer-conflict') {
        atualizarRelacao(userId, {
          connection_status: 'CONFIRMED',
          connection_direction: null,
          connections_count: pessoa.connections_count + 1,
        });
        throw new MockApiError(409, 'Connection already answered');
      }
      // A outra pessoa cancelou a solicitação antes da resposta.
      if (userId === 'answer-gone') {
        atualizarRelacao(userId, SEM_CONEXAO);
        throw new MockApiError(404, 'Connection not found');
      }

      atualizarRelacao(
        userId,
        body.status === 'CONFIRMED'
          ? { connection_status: 'CONFIRMED', connection_direction: null, connections_count: pessoa.connections_count + 1 }
          : // Sem `connection_id` na recusa, como na task 281 [BE].
            { connection_status: 'REJECTED', connection_id: null, connection_direction: null },
      );
      const resultado: ConnectionAnswerResult = {
        connection_id: connectionId,
        requester_id: userId,
        receiver_id: 'usuario-logado',
        status: body.status,
        updated_at: new Date().toISOString(),
      };
      return resultado as T;
    }

    if (userId === 'cancel-boom' || userId === 'undo-boom') throw new MockApiError(500, 'Internal server error');
    const conexoesDepois = pessoa.connections_count - (pessoa.connection_status === 'CONFIRMED' ? 1 : 0);
    // A outra pessoa já cancelou ou desfez.
    if (userId === 'undo-gone' || userId === 'cancel-gone') {
      atualizarRelacao(userId, { ...SEM_CONEXAO, connections_count: conexoesDepois });
      throw new MockApiError(404, 'Connection not found');
    }
    // A conexão deixou de ser entre os dois; o GET seguinte vem sem conexão.
    if (userId === 'undo-forbidden') {
      atualizarRelacao(userId, { ...SEM_CONEXAO, connections_count: conexoesDepois });
      throw new MockApiError(403, 'Not part of this connection');
    }
    atualizarRelacao(userId, { ...SEM_CONEXAO, connections_count: conexoesDepois });
    return undefined as T;
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
    const estabelecimento = perfilVisitado(businessId);
    const ehEstabelecimento = estabelecimento.user_type === 'BUSINESS';

    if (method === 'POST') {
      if (!ehEstabelecimento) throw new MockApiError(403, 'Target is not a business profile');
      if (businessId === 'business-boom') throw new MockApiError(500, 'Internal server error');
      if (businessId === 'follow-gone') {
        db.usuariosIndisponiveis.push(businessId);
        throw new MockApiError(404, 'Business not found');
      }
      if (!estabelecimento.is_following) {
        atualizarRelacao(businessId, { is_following: true, ...mudancaDeSeguidores(estabelecimento, 1) });
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
        atualizarRelacao(businessId, { is_following: false, ...mudancaDeSeguidores(estabelecimento, -1) });
      }
      return undefined as T;
    }
  }

  throw new MockApiError(404, 'Not found');
}
