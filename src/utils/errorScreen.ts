import type { ErrorScreenProps } from '@/components/ErrorScreen';
import type { IconName } from '@/components/Icon';
import type { LoadError, LoadErrorKind } from '@/utils/apiErrors';

/**
 * Ponte entre o `LoadError` dos hooks (`describeLoadError`) e as props do
 * `ErrorScreen`. Fica aqui, e não no componente, para o `ErrorScreen` não
 * conhecer nenhuma regra da API.
 */

const APPEARANCE: Record<LoadErrorKind, Pick<ErrorScreenProps, 'icon' | 'tone'>> = {
  server: { icon: 'circle-alert', tone: 'error' },
  timeout: { icon: 'clock', tone: 'warning' },
  offline: { icon: 'map-pin-off', tone: 'warning' },
  unavailable: { icon: 'calendar-x', tone: 'neutral' },
  cancelled: { icon: 'calendar-x', tone: 'neutral' },
};

/**
 * Texto do frame `Sem conexão`. O `LoadError.message` de offline continua curto
 * ("Sem conexão com a internet") porque também é usado em toasts.
 */
const OFFLINE_SCREEN = {
  title: 'Você está sem internet',
  message: 'O Hangy precisa de conexão para carregar eventos e o mapa Ao Vivo. Verifique o Wi-Fi ou os dados móveis.',
};

export type LoadErrorScreenOptions = {
  /** Refaz a requisição que falhou (o `reload` do hook). */
  onRetry?: () => void;
  /** Saída quando insistir não adianta (404, 410). Sem ela, a tela só informa. */
  onBack?: () => void;
  /** Ex.: "Tentar carregar o evento novamente". Padrão: o próprio label. */
  retryAccessibilityLabel?: string;
  /** Requisição refeita em voo: o botão entra em `State=Loading`. */
  isRetrying?: boolean;
  /** Troca o ícone do caso não recuperável (ex.: `user` num perfil indisponível). */
  unavailableIcon?: IconName;
};

export function loadErrorScreenProps(
  error: LoadError,
  { onRetry, onBack, retryAccessibilityLabel, isRetrying, unavailableIcon }: LoadErrorScreenOptions = {},
): ErrorScreenProps {
  const appearance = APPEARANCE[error.kind];
  const copy = error.kind === 'offline' ? OFFLINE_SCREEN : { title: error.title, message: error.message };
  const icon = !error.canRetry && unavailableIcon ? unavailableIcon : appearance.icon;

  let action: ErrorScreenProps['action'];
  if (error.canRetry && onRetry) {
    action = {
      label: 'Tentar de novo',
      accessibilityLabel: retryAccessibilityLabel,
      onPress: onRetry,
      isLoading: isRetrying,
    };
  } else if (!error.canRetry && onBack) {
    action = { label: 'Voltar', onPress: onBack };
  }

  return { ...copy, ...appearance, icon, action };
}
