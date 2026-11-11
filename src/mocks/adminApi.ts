import type { ModerationPayload, UserModerationStatus } from '@/types/admin';
import type { AdminReportDetail } from '@/types/adminReport';

type ModerationStatus = UserModerationStatus;

/**
 * Mocks do detalhe de denúncia e das ações de moderação, ligados por
 * `USE_API_MOCKS` via `resolveMock` (`@/mocks/eventApi`).
 *
 * Espelham as tasks 245 (detalhe), 246 (arquivar) e 249 (moderar) [BE], já na
 * `develop` do backend, para testar a tela sem banco semeado. O estado é
 * mutável: banir, suspender e arquivar mudam o mock, e o `GET` seguinte já
 * vem resolvido. Só o `PATCH` de moderação com `report_id` passa por aqui: o
 * da ficha do usuário (sem denúncia) segue como na `develop`.
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
 * | `taken`     | Qualquer ação devolve `409 Report already resolved` e o `GET` seguinte vem resolvido |
 * | `missing`   | `404 Report not found`                                          |
 * | `boom`      | `500` no detalhe                                                |
 * | `fail`      | Detalhe normal, ações devolvem `500`                            |
 * | `offline`   | Detalhe normal, ações falham por falta de rede                   |
 */

export type AdminMockOutcome =
  | { resposta: unknown }
  | { erro: { status: number; detail: string } }
  | { semRede: true };

const ADMIN_MOCK = { id: 'admin-mock', name: 'Gabriel Nunes' };
const CONTA_DENUNCIADA_ID = 'conta-denunciada';

const HORA = 60 * 60 * 1000;

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
  return base;
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
    return { erro: { status: 409, detail: 'Report already resolved' } };
  }
  if (!aberta(reportId)) return { erro: { status: 409, detail: 'Report already resolved' } };
  return null;
}

/** `undefined` quando a rota não é do painel administrativo. */
export function resolveAdminMock(partes: string[], method: string, init: RequestInit): AdminMockOutcome | undefined {
  if (partes[0] !== 'admin') return undefined;

  // GET /admin/reports/{id}
  if (partes[1] === 'reports' && partes.length === 3 && method === 'GET') {
    const reportId = partes[2];
    if (reportId === 'missing') return { erro: { status: 404, detail: 'Report not found' } };
    if (reportId === 'boom') return { erro: { status: 500, detail: 'Internal server error' } };
    return { resposta: denuncia(reportId) };
  }

  // PATCH /admin/reports/{id}/archive (task 246 [BE]).
  if (partes[1] === 'reports' && partes[3] === 'archive' && method === 'PATCH') {
    const reportId = partes[2];
    const falha = falhaDaAcao(reportId);
    if (falha) return falha;
    return { resposta: resolver(reportId, 'ARCHIVED', null, 'REJECTED') };
  }

  // PATCH /admin/users/{id}/moderation com `report_id` (banir ou suspender pela denúncia).
  if (partes[1] === 'users' && partes[3] === 'moderation' && method === 'PATCH') {
    const body = JSON.parse(String(init.body ?? '{}')) as ModerationPayload;
    if (body.action === 'REVERT' || !body.report_id) return undefined;
    const reportId = body.report_id;
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
        role: 'USER',
        moderation_status: status,
        suspended_until: suspensoAte,
        created_at: `${atualizada.target.member_since}T12:00:00Z`,
      },
    };
  }

  return undefined;
}
