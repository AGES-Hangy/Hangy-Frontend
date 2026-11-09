import type {
  AdminReportDetail,
  AdminReportQueueItem,
  AdminUserModerationInput,
  ModerationStatus,
} from '@/types/adminReport';

/**
 * Mocks do detalhe de denúncia e das ações de moderação, ligados por
 * `USE_API_MOCKS` via `resolveMock` (`@/mocks/eventApi`).
 *
 * Existem porque as tasks 245 e 249 [BE] ainda não entraram na `develop` e a
 * 246 (arquivar) ainda não subiu. O estado é mutável: banir, suspender e
 * arquivar mudam o mock, e o `GET` seguinte já vem resolvido.
 *
 * ## Cenários de teste
 *
 * O `report_id` da rota escolhe o cenário — `/Admin/Denuncias/resolved`, por exemplo:
 *
 * | `report_id` | O que acontece                                                  |
 * | ----------- | --------------------------------------------------------------- |
 * | qualquer    | Denúncia `REVIEWED` (Em análise), conta ativa                   |
 * | `pending`   | Denúncia `PENDING`, sem denúncias anteriores                    |
 * | `resolved`  | Já resolvida com banimento                                      |
 * | `archived`  | Já arquivada (`REJECTED`)                                       |
 * | `suspended` | Conta já suspensa por outra denúncia; suspender de novo funciona |
 * | `banned`    | Conta já banida: suspender devolve `409 Account is already banned` |
 * | `taken`     | Qualquer ação devolve `409 Report is no longer open` e o `GET` seguinte vem resolvido |
 * | `missing`   | `404 Report not found`                                          |
 * | `boom`      | `500` no detalhe                                                |
 * | `fail`      | Detalhe normal, ações devolvem `500`                            |
 * | `offline`   | Detalhe normal, ações falham por falta de rede                   |
 *
 * A fila (`GET /admin/reports`, task 244 [BE]) tem denúncias em Pendentes e Em
 * análise; Resolvidas começa vazia e enche com as ações do detalhe. Pendentes
 * tem mais de uma página. Buscar `boom` devolve `500` e `offline` falha por
 * falta de rede. `?target_user_id=conta-denunciada` (Lucas, só em Em análise) e
 * `?target_event_id=evento-churrasco` testam o filtro por alvo (task 297 [BE]).
 */

export type AdminMockOutcome =
  | { resposta: unknown }
  | { erro: { status: number; detail: string } }
  | { semRede: true };

const ADMIN_MOCK = { id: 'admin-mock', name: 'Gabriel Nunes' };
const CONTA_DENUNCIADA_ID = 'conta-denunciada';

const HORA = 60 * 60 * 1000;

const FILA_POR_PAGINA = 20;

type LinhaDaFila = Omit<AdminReportQueueItem, 'opened_at'> & { horasAtras: number; alvoId: string };

const FILA: LinhaDaFila[] = [
  {
    report_id: 'fila-1043',
    alvoId: 'evento-churrasco',
    report_number: 1043,
    target_type: 'EVENT',
    target_name: 'Churrasco na Redenção',
    report_count: 1,
    status: 'PENDING',
    reason: 'INAPPROPRIATE_CONTENT',
    description_excerpt: 'A foto de capa do evento tem conteúdo adulto e o evento está marcado como público.',
    horasAtras: 5,
  },
  {
    report_id: 'fila-1044',
    alvoId: 'conta-bruno',
    report_number: 1044,
    target_type: 'USER',
    target_name: 'Bruno Tavares',
    report_count: 1,
    status: 'PENDING',
    reason: 'FAKE_PROFILE',
    description_excerpt: 'O perfil usa fotos de outra pessoa e cobra entrada em eventos que nunca acontecem.',
    horasAtras: 24,
  },
  {
    report_id: 'fila-1042',
    alvoId: CONTA_DENUNCIADA_ID,
    report_number: 1042,
    target_type: 'USER',
    target_name: 'Lucas Ferreira',
    report_count: 3,
    status: 'REVIEWED',
    reason: 'HARASSMENT',
    description_excerpt: 'Ele mandou mensagens ofensivas no chat do evento depois que recusei a solicitação de conexão.',
    horasAtras: 2,
  },
  ...Array.from({ length: 24 }, (_, index): LinhaDaFila => ({
    report_id: `fila-${1100 + index}`,
    alvoId: `conta-teste-${index + 1}`,
    report_number: 1100 + index,
    target_type: 'USER',
    target_name: `Conta de Teste ${index + 1}`,
    report_count: 1,
    status: 'PENDING',
    reason: 'SPAM',
    description_excerpt: 'Envia o mesmo convite para todo mundo dos eventos.',
    horasAtras: 30 + index,
  })),
];

function denunciaInicial(reportId: string): AdminReportDetail {
  const agora = Date.now();
  const base: AdminReportDetail = {
    report_id: reportId,
    report_number: 1042,
    status: reportId === 'pending' ? 'PENDING' : 'REVIEWED',
    opened_at: new Date(agora - 2 * HORA).toISOString(),
    target: {
      type: 'USER',
      id: CONTA_DENUNCIADA_ID,
      name: 'Lucas Ferreira',
      member_since: '2025-03-14',
      event_count: 12,
      moderation_status: 'ACTIVE',
    },
    reason: 'HARASSMENT',
    description:
      'Ele mandou mensagens ofensivas no chat do evento depois que recusei a solicitação de conexão. Depois criou outro perfil para insistir.',
    reported_by: { id: 'quem-denunciou', name: 'Marina Souza' },
    reported_at: new Date(agora - 26 * HORA).toISOString(),
    previous_reports:
      reportId === 'pending'
        ? { total: 0, archived: 0, resolved_with_action: 0 }
        : { total: 2, archived: 1, resolved_with_action: 1 },
    resolution: null,
  };

  const resolvida = (action: string, status: ModerationStatus, reportStatus: 'RESOLVED' | 'REJECTED') => ({
    ...base,
    status: reportStatus,
    target: { ...base.target, moderation_status: status },
    resolution: { resolved_by: ADMIN_MOCK, resolved_at: new Date(agora - HORA).toISOString(), action },
  });

  if (reportId === 'resolved') return resolvida('BANNED', 'BANNED', 'RESOLVED');
  if (reportId === 'archived') return resolvida('ARCHIVED', 'ACTIVE', 'REJECTED');
  if (reportId === 'suspended') return { ...base, target: { ...base.target, moderation_status: 'SUSPENDED' } };
  if (reportId === 'banned') return { ...base, target: { ...base.target, moderation_status: 'BANNED' } };

  const linha = FILA.find((item) => item.report_id === reportId);
  if (!linha) return base;
  return {
    ...base,
    report_number: linha.report_number,
    status: linha.status,
    opened_at: new Date(agora - linha.horasAtras * HORA).toISOString(),
    target: {
      ...base.target,
      type: linha.target_type ?? 'USER',
      name: linha.target_name,
    },
    reason: linha.reason,
    description: linha.description_excerpt,
  };
}

const denuncias = new Map<string, AdminReportDetail>();

function denuncia(reportId: string) {
  let atual = denuncias.get(reportId);
  if (!atual) {
    atual = denunciaInicial(reportId);
    denuncias.set(reportId, atual);
  }
  return atual;
}

function resolver(reportId: string, action: string, status: ModerationStatus | null, reportStatus: 'RESOLVED' | 'REJECTED') {
  const atual = denuncia(reportId);
  const atualizada: AdminReportDetail = {
    ...atual,
    status: reportStatus,
    target: status ? { ...atual.target, moderation_status: status } : atual.target,
    resolution: { resolved_by: ADMIN_MOCK, resolved_at: new Date().toISOString(), action },
  };
  denuncias.set(reportId, atualizada);
  return atualizada;
}

function aberta(reportId: string) {
  const { status } = denuncia(reportId);
  return status === 'PENDING' || status === 'REVIEWED';
}

function falhaDaAcao(reportId: string): AdminMockOutcome | null {
  if (reportId === 'offline') return { semRede: true };
  if (reportId === 'fail') return { erro: { status: 500, detail: 'Internal server error' } };
  if (reportId === 'taken') {
    // Outro admin resolveu enquanto a tela estava aberta.
    if (aberta(reportId)) resolver(reportId, 'BANNED', 'BANNED', 'RESOLVED');
    return { erro: { status: 409, detail: 'Report is no longer open' } };
  }
  if (!aberta(reportId)) return { erro: { status: 409, detail: 'Report is no longer open' } };
  return null;
}

function filaDeDenuncias(query: string): AdminMockOutcome {
  const params = new URLSearchParams(query);
  const busca = (params.get('search') ?? '').trim().toLowerCase();
  if (busca === 'boom') return { erro: { status: 500, detail: 'Internal server error' } };
  if (busca === 'offline') return { semRede: true };

  const status = params.get('status');
  const numero = busca.replace(/^#/, '');
  const agora = Date.now();
  const alvoId = params.get('target_user_id') ?? params.get('target_event_id');
  const linhas = FILA.filter((linha) => !alvoId || linha.alvoId === alvoId).map(({ horasAtras, alvoId: _alvo, ...linha }) => ({
    ...linha,
    // O estado do detalhe manda: resolver lá tira a denúncia da aba aberta.
    status: denuncias.get(linha.report_id)?.status ?? linha.status,
    opened_at: new Date(agora - horasAtras * HORA).toISOString(),
  }))
    .filter((linha) => (status ? linha.status === status : linha.status !== 'REJECTED'))
    .filter(
      (linha) =>
        !busca ||
        (linha.target_name ?? '').toLowerCase().includes(busca) ||
        String(linha.report_number) === numero,
    )
    .sort((a, b) => Date.parse(b.opened_at) - Date.parse(a.opened_at));

  const inicio = Number(params.get('cursor') ?? 0);
  const fim = inicio + Number(params.get('limit') ?? FILA_POR_PAGINA);
  return {
    resposta: {
      items: linhas.slice(inicio, fim),
      next_cursor: fim < linhas.length ? String(fim) : null,
    },
  };
}

/** `undefined` quando a rota não é do painel administrativo. */
export function resolveAdminMock(
  partes: string[],
  method: string,
  init: RequestInit,
  query = '',
): AdminMockOutcome | undefined {
  if (partes[0] !== 'admin') return undefined;

  // GET /admin/reports
  if (partes[1] === 'reports' && partes.length === 2 && method === 'GET') {
    return filaDeDenuncias(query);
  }

  // GET /admin/reports/{id}
  if (partes[1] === 'reports' && partes.length === 3 && method === 'GET') {
    const reportId = partes[2];
    if (reportId === 'missing') return { erro: { status: 404, detail: 'Report not found' } };
    if (reportId === 'boom') return { erro: { status: 500, detail: 'Internal server error' } };
    return { resposta: denuncia(reportId) };
  }

  // PATCH /admin/reports/{id}/archive — contrato proposto da task 246.
  if (partes[1] === 'reports' && partes[3] === 'archive' && method === 'PATCH') {
    const reportId = partes[2];
    const falha = falhaDaAcao(reportId);
    if (falha) return falha;
    return { resposta: resolver(reportId, 'ARCHIVED', null, 'REJECTED') };
  }

  // PATCH /admin/users/{id}/moderation
  if (partes[1] === 'users' && partes[3] === 'moderation' && method === 'PATCH') {
    const body = JSON.parse(String(init.body ?? '{}')) as AdminUserModerationInput;
    const reportId = body.report_id ?? '';
    const falha = falhaDaAcao(reportId);
    if (falha) return falha;

    const atual = denuncia(reportId);
    if (body.action === 'SUSPEND' && atual.target.moderation_status === 'BANNED') {
      return { erro: { status: 409, detail: 'Account is already banned' } };
    }

    const status: ModerationStatus = body.action === 'BAN' ? 'BANNED' : 'SUSPENDED';
    const atualizada = resolver(reportId, body.action === 'BAN' ? 'BANNED' : 'SUSPENDED', status, 'RESOLVED');
    const suspensoAte =
      body.action === 'SUSPEND' ? new Date(Date.now() + body.duration_days * 24 * HORA).toISOString() : null;

    return {
      resposta: {
        user_id: atualizada.target.id,
        name: atualizada.target.name,
        email: 'lucas@exemplo.com',
        moderation_status: status,
        suspended_until: suspensoAte,
        created_at: `${atualizada.target.member_since}T12:00:00Z`,
      },
    };
  }

  return undefined;
}
