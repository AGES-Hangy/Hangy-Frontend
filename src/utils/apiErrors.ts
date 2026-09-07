import { ApiError } from '@/utils/http';

/**
 * Tradução dos erros da API para o que a tela mostra.
 *
 * A tabela de tratamento de erro da task mistura duas coisas: o que aparece no
 * lugar do conteúdo (evento cancelado, indisponível, erro de servidor) e o que
 * aparece por cima dele (um toast e um recarregamento). Este módulo separa as
 * duas: `describeLoadError` responde a primeira, `describeActionError` a
 * segunda. Tudo num lugar só, para as duas telas contarem a mesma história.
 */

/** Estado que substitui o conteúdo da tela quando o `GET` falha. */
export type LoadErrorKind = 'cancelled' | 'unavailable' | 'server' | 'offline' | 'timeout';

export interface LoadError {
  kind: LoadErrorKind;
  title: string;
  message: string;
  /** `false` quando insistir não adianta — evento cancelado ou inexistente. */
  canRetry: boolean;
}

export function describeLoadError(error: unknown): LoadError {
  if (error instanceof ApiError || isApiErrorLike(error)) {
    const { kind, status } = error;

    if (kind === 'network') {
      return {
        kind: 'offline',
        title: 'Sem conexão',
        message: 'Sem conexão com a internet',
        canRetry: true,
      };
    }

    if (kind === 'timeout') {
      return {
        kind: 'timeout',
        title: 'Demorou demais',
        message: 'A conexão demorou demais',
        canRetry: true,
      };
    }

    if (status === 410) {
      return {
        kind: 'cancelled',
        title: 'Evento cancelado',
        message: 'Este evento foi cancelado',
        canRetry: false,
      };
    }

    if (status === 404) {
      // Ambíguo de propósito: 404 aqui também é evento por convite sem
      // convite, e a mensagem não pode entregar que o evento existe.
      return {
        kind: 'unavailable',
        title: 'Evento indisponível',
        message: 'Evento não encontrado ou não disponível para você',
        canRetry: false,
      };
    }
  }

  return {
    kind: 'server',
    title: 'Não foi possível carregar',
    message: 'Não foi possível carregar. Tente de novo.',
    canRetry: true,
  };
}

/** O que fazer com o erro de uma ação (aprovar, recusar, remover, cancelar). */
export interface ActionError {
  message: string;
  tone: 'error' | 'warning';
  /** O estado local ficou dessincronizado: recarregar do servidor. */
  shouldReload: boolean;
  /** O evento não aceita mais escrita: a tela vira somente leitura. */
  readOnly: boolean;
  /** O evento lotou: desabilitar aprovar em todos os pendentes. */
  full: boolean;
}

const GENERIC_ACTION_ERROR: ActionError = {
  message: 'Não foi possível concluir a ação. Tente de novo.',
  tone: 'error',
  shouldReload: false,
  readOnly: false,
  full: false,
};

export function describeActionError(error: unknown): ActionError {
  if (!(error instanceof ApiError || isApiErrorLike(error))) return GENERIC_ACTION_ERROR;

  const { kind, status, detail } = error;

  if (kind === 'network') {
    return { ...GENERIC_ACTION_ERROR, message: 'Sem conexão com a internet' };
  }

  if (kind === 'timeout') {
    return { ...GENERIC_ACTION_ERROR, message: 'A conexão demorou demais' };
  }

  if (status === 409 && detail === 'Event is full') {
    return {
      message: 'Este evento está lotado',
      tone: 'warning',
      shouldReload: false,
      readOnly: false,
      full: true,
    };
  }

  if (status === 409 && detail === 'Event already finished') {
    return {
      message: 'Este evento já terminou',
      tone: 'warning',
      shouldReload: true,
      readOnly: true,
      full: false,
    };
  }

  if (status === 400 && detail === 'Invalid status transition') {
    return {
      message: 'Essa ação não é mais possível para este participante',
      tone: 'warning',
      shouldReload: true,
      readOnly: false,
      full: false,
    };
  }

  if (status === 403 && detail === 'Only the organizer can manage participants') {
    return {
      message: 'Só o organizador pode gerenciar participantes',
      tone: 'error',
      shouldReload: true,
      readOnly: true,
      full: false,
    };
  }

  if (status === 403 && detail === 'Only the organizer can edit this event') {
    return {
      message: 'Só o organizador pode alterar este evento',
      tone: 'error',
      shouldReload: true,
      readOnly: true,
      full: false,
    };
  }

  if (status === 404 && detail === 'Participant not found') {
    // Sem mensagem para o usuário: é estado dessincronizado, o recarregamento
    // já conta a história.
    return { ...GENERIC_ACTION_ERROR, message: '', shouldReload: true };
  }

  if (status === 400) {
    // Erro de programação do app: enum fechado não deveria ser recusado.
    console.warn('[api] requisição inválida:', status, detail);
    return GENERIC_ACTION_ERROR;
  }

  return GENERIC_ACTION_ERROR;
}

/**
 * O mock devolve um erro com o mesmo formato do `ApiError`, mas de outra
 * classe — `instanceof` não pega. Este teste estrutural cobre os dois.
 */
function isApiErrorLike(
  error: unknown,
): error is { kind: string; status: number | null; detail: string | null } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    'status' in error &&
    'detail' in error
  );
}
