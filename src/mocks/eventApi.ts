import type {
  EventDetail,
  EventParticipant,
  EventParticipantItem,
  EventShare,
  ParticipantsPage,
} from '@/types/event';

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

  throw new MockApiError(404, 'Not found');
}
