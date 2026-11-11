import { isApiErrorLike } from '@/utils/apiErrors';

/**
 * Tradução dos erros de `GET /reports/reasons` e `POST /reports` para o que a
 * tela de denúncia faz — a tabela de tratamento de erro da task 090 inteira,
 * num lugar só.
 *
 * - `inline`: mensagem acima da lista de motivos, a tela fica como está.
 * - `toast`: aviso por cima; `then` diz se a tela fecha, recarrega os motivos
 *   ou fica parada. `retry` liga a ação "Tentar de novo" no toast.
 * - `screen`: o conteúdo vira a tela de erro com retry (só no carregamento).
 * - `none`: 401, que o `apiFetch` já entregou ao tratamento global.
 */
export type ReportFailure =
  | { kind: 'inline'; message: string }
  | {
      kind: 'toast';
      tone: 'error' | 'info';
      message: string;
      then: 'close' | 'reload' | 'stay';
      retry?: boolean;
    }
  | { kind: 'screen'; title: string; message: string }
  | { kind: 'none' };

const GENERIC_MESSAGE = 'Não foi possível concluir a denúncia. Tente de novo.';

export function describeReportError(error: unknown, stage: 'load' | 'submit'): ReportFailure {
  if (!isApiErrorLike(error)) {
    return stage === 'load'
      ? { kind: 'screen', title: 'Não foi possível carregar', message: 'Não foi possível carregar. Tente de novo.' }
      : { kind: 'toast', tone: 'error', message: GENERIC_MESSAGE, then: 'stay' };
  }

  const { kind, status, detail } = error;

  if (kind === 'network') {
    // O `OfflineBanner` já está na tela; o toast só confirma por que o envio não foi.
    return stage === 'load'
      ? { kind: 'screen', title: 'Sem conexão', message: 'Sem conexão com a internet' }
      : { kind: 'toast', tone: 'error', message: 'Sem conexão com a internet', then: 'stay' };
  }

  if (kind === 'timeout') {
    return { kind: 'toast', tone: 'error', message: 'A conexão demorou demais', then: 'stay', retry: true };
  }

  if (status === 401) return { kind: 'none' };

  if (status === 400 && detail === 'Invalid report reason') {
    return { kind: 'inline', message: 'Escolha um motivo' };
  }

  if (status === 400) {
    // Erro de programação do app: o ponto de entrada já não aparece para o
    // próprio perfil, e a tela sempre manda exatamente um alvo.
    console.warn('[report] requisição inválida:', status, detail);
    return {
      kind: 'toast',
      tone: 'error',
      message: GENERIC_MESSAGE,
      then: detail === 'Cannot report yourself' ? 'close' : 'stay',
    };
  }

  if (status === 403 && detail === 'Reason requires participation') {
    return { kind: 'toast', tone: 'info', message: 'Esse motivo é só para quem participou', then: 'reload' };
  }

  if (status === 403) {
    // `Only participants can report this event`: o evento mudou desde que o
    // detalhe foi aberto (ficou privado, ou a participação caiu).
    return {
      kind: 'toast',
      tone: 'info',
      message: 'Só quem participa deste evento pode denunciá-lo',
      then: 'close',
    };
  }

  if (status === 404) {
    return { kind: 'toast', tone: 'error', message: 'Perfil ou evento não encontrado', then: 'close' };
  }

  if (status === 409) {
    return {
      kind: 'toast',
      tone: 'info',
      message: 'Você já denunciou por esse motivo e ela está em análise',
      then: 'reload',
    };
  }

  return stage === 'load'
    ? { kind: 'screen', title: 'Não foi possível carregar', message: 'Não foi possível carregar. Tente de novo.' }
    : { kind: 'toast', tone: 'error', message: GENERIC_MESSAGE, then: 'stay', retry: true };
}
