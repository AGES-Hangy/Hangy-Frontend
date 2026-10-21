import { endpoints } from '@/constants/api';
import type {
  EventDetail,
  EventParticipant,
  EventParticipantItem,
  EventShare,
  ParticipantsPage,
} from '@/types/event';
import type { ApiUploadOptions, UploadFile } from '@/utils/http';

/**
 * Respostas de mentira dos endpoints de evento, ligadas por `USE_API_MOCKS`
 * em `@/constants/api`.
 *
 * Existe porque as tasks de backend 103, 097, 209, 099, 101 e 276 ainda não
 * subiram. O formato é cópia do contrato acordado, então quando o backend
 * chegar é só desligar a flag — nada nas telas nem nos hooks muda.
 *
 * Também cobre `GET /terms/current` (task 212 [BE], também não subiu) pelo
 * mesmo motivo — não é um endpoint de evento, mas é só mais um backend que
 * falta, e criar um segundo arquivo/dispatcher pra um caso só seria over-engineering.
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
 * ## Envio da capa (`POST /uploads/event-covers`, task 276)
 *
 * `EXPO_PUBLIC_MOCK_UPLOAD` escolhe o resultado de cada envio: uma sequência
 * separada por vírgulas, consumida um envio por vez (cancelar também conta).
 * O último valor se repete; sem a variável, vale `ok`. A sequência só recomeça
 * quando o app recarrega.
 *
 * | Valor     | O que acontece                                                |
 * | --------- | ------------------------------------------------------------- |
 * | `ok`      | Progresso em ~1,5 s e 201 com URL no formato do bucket          |
 * | `slow`    | Igual a `ok`, em ~10 s: dá tempo de cancelar ou sair da tela    |
 * | `nototal` | Como `slow`, mas sem total: o progresso vem sempre `null`       |
 * | `413`     | `413 Image too large` depois do envio completo                  |
 * | `415`     | `415 Unsupported image type` depois do envio completo           |
 * | `503`     | `503 Image storage unavailable` depois do envio completo        |
 * | `offline` | Falha de rede com ~30% enviado                                 |
 * | `foreign` | 201 com URL fora do bucket, para o 400 do `PATCH /events/{id}`  |
 *
 * Ex.: `npx cross-env EXPO_PUBLIC_MOCK_UPLOAD=503,ok npm run start:stub`
 * (PowerShell: `$env:EXPO_PUBLIC_MOCK_UPLOAD='503,ok'; npm run start:stub`).
 * Para trocar o valor, reinicie o `start:stub`; `--clear` não é preciso
 * (confirmado no web em 21/10): em dev, o `babel-preset-expo` não grava o
 * valor no módulo transformado, só uma referência a `expo/virtual/env`. Na
 * web, abra uma aba nova pelo `w` e espere o "Web Bundled": F5 numa aba
 * aberta antes de reiniciar continua com o valor antigo.
 *
 * A URL do bucket devolvida aqui não aponta para imagem nenhuma: depois de
 * salvar, o detalhe mostra a capa quebrada.
 *
 * `PATCH /events/{id}` trata `cover_photo_url` como a task 276: omitido mantém
 * a capa, `null` remove, e uma URL fora do bucket e diferente da salva vira
 * `400 Invalid cover photo URL`. Os campos editados são um só para o mock
 * inteiro, não por evento: remover ou trocar a capa vale para o detalhe de
 * qualquer `event_id`, e a "capa salva" da comparação é a do último PATCH
 * gravado (ou a padrão, antes do primeiro).
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
    // `null` gravado pelo PATCH é "sem capa": com `??`, a padrão voltaria.
    cover_photo_url: overrides ? overrides.cover_photo_url : 'https://picsum.photos/seed/hangy-evento/900/600',
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

  if (partes[0] === 'events' && partes.length === 2 && method === 'GET') {
    erroDoCenario(eventId);
    return detalhe(eventId) as T;
  }

  if (partes[0] === 'events' && partes.length === 2 && method === 'PATCH') {
    if (eventId === 'finished') throw new MockApiError(409, 'Event already finished');

    const body = init.body ? JSON.parse(String(init.body)) : {};
    // Os campos de local só vêm quando o endereço mudou, e a capa só quando
    // foi trocada ou removida; sem eles, vale o que o evento já tinha.
    const atual = detalhe(eventId);
    const capa = 'cover_photo_url' in body ? body.cover_photo_url : atual.cover_photo_url;
    if (typeof capa === 'string' && capa !== atual.cover_photo_url && !capa.startsWith(BUCKET_DE_MIDIA)) {
      throw new MockApiError(400, 'Invalid cover photo URL');
    }

    db.overrides = {
      title: body.title,
      description: body.description ?? null,
      cover_photo_url: capa ?? null,
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

/** Prefixo das URLs que a API grava. Aproximação do `owns(url)` do backend. */
const BUCKET_DE_MIDIA = 'https://hangy-media.s3.us-east-1.amazonaws.com/';

const CENARIOS_DE_ENVIO = ['ok', 'slow', 'nototal', '413', '415', '503', 'offline', 'foreign'] as const;
type CenarioDeEnvio = (typeof CENARIOS_DE_ENVIO)[number];

const ehCenarioDeEnvio = (valor: string): valor is CenarioDeEnvio =>
  (CENARIOS_DE_ENVIO as readonly string[]).includes(valor);

function lerSequenciaDeEnvio(): CenarioDeEnvio[] {
  const bruto: string = process.env.EXPO_PUBLIC_MOCK_UPLOAD ?? '';
  const valores = bruto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);

  // Avisa em vez de cair em `ok` calado: um erro de digitação passaria por
  // teste do caminho feliz.
  const desconhecidos = valores.filter((valor) => !ehCenarioDeEnvio(valor));
  if (desconhecidos.length > 0) {
    console.warn(
      `EXPO_PUBLIC_MOCK_UPLOAD: ignorando ${desconhecidos.join(', ')}. Valores válidos: ${CENARIOS_DE_ENVIO.join(', ')}.`,
    );
  }

  const validos = valores.filter(ehCenarioDeEnvio);
  return validos.length > 0 ? validos : ['ok'];
}

const SEQUENCIA_DE_ENVIO = lerSequenciaDeEnvio();
let enviosFeitos = 0;

function proximoCenarioDeEnvio(): CenarioDeEnvio {
  const cenario = SEQUENCIA_DE_ENVIO[Math.min(enviosFeitos, SEQUENCIA_DE_ENVIO.length - 1)];
  enviosFeitos += 1;
  return cenario;
}

/**
 * Como `wait`, mas para o relógio se o envio for cancelado. O erro daqui não
 * chega a quem chamou, porque `apiUpload` já rejeitou com `UploadCancelledError`;
 * importar essa classe criaria um ciclo com `@/utils/http`.
 */
function esperar(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }

    const parar = () => {
      clearTimeout(timer);
      reject(new Error('aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', parar);
      resolve();
    }, ms);
    signal?.addEventListener('abort', parar);
  });
}

function ritmoDoEnvio(cenario: CenarioDeEnvio) {
  return cenario === 'slow' || cenario === 'nototal' ? { passos: 20, passoMs: 500 } : { passos: 10, passoMs: 150 };
}

/**
 * `POST /uploads/event-covers`. Fica fora do `resolveMock` porque o envio tem
 * progresso e cancelamento, que `apiFetch` não tem. Quem rejeita no
 * cancelamento é o `apiUpload`, em volta desta função; aqui o `signal` só para
 * o progresso simulado. Cenários no cabeçalho do arquivo.
 */
export async function resolveUploadMock<T>(
  path: string,
  file: UploadFile,
  { onProgress, signal }: ApiUploadOptions = {},
): Promise<T> {
  if (path !== endpoints.eventCovers()) {
    await esperar(MOCK_LATENCY_MS, signal);
    throw new MockApiError(404, 'Not found');
  }

  const cenario = proximoCenarioDeEnvio();
  const { passos, passoMs } = ritmoDoEnvio(cenario);
  const ultimoPasso = cenario === 'offline' ? Math.round(passos * 0.3) : passos;

  for (let passo = 1; passo <= ultimoPasso; passo += 1) {
    await esperar(passoMs, signal);
    onProgress?.(cenario === 'nototal' ? null : passo / passos);
  }
  if (cenario === 'offline') throw new MockNetworkError();

  // A API só responde depois do último byte, enquanto grava no S3.
  await esperar(MOCK_LATENCY_MS, signal);

  if (cenario === '413') throw new MockApiError(413, 'Image too large');
  if (cenario === '415') throw new MockApiError(415, 'Unsupported image type');
  if (cenario === '503') throw new MockApiError(503, 'Image storage unavailable');

  const extensao = file.mimeType === 'image/png' ? 'png' : 'jpg';
  const id = Math.random().toString(36).slice(2, 10);
  return {
    cover_photo_url:
      cenario === 'foreign'
        ? `https://example.com/capa-${id}.${extensao}`
        : `${BUCKET_DE_MIDIA}events/covers/${id}.${extensao}`,
  } as T;
}
