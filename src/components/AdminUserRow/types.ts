/** Status de moderação de um usuário — eixo de variante do AdminUserRow. */
export type ModerationStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

type AdminUserRowBase = {
  /** Nome completo do usuário. */
  name: string;
  /** Foto do usuário. Sem ela, o Avatar mostra o ícone padrão de pessoa. */
  avatarUri?: string;
  /**
   * Chamado ao tocar na linha. Sem ele, a linha é só informativa e não vira
   * botão — ex.: a conta denunciada no detalhe da denúncia.
   */
  onPress?: () => void;
  /**
   * Substitui o resumo montado a partir das contagens, para telas cujo frame
   * pede outro texto (ex.: "Membro desde 03/2025 · 12 eventos").
   */
  summary?: string;
};

type ActiveUserRowProps = AdminUserRowBase & {
  moderationStatus: 'ACTIVE';
  /** Quantidade de eventos criados pelo usuário. */
  eventCount: number;
  /** Número de denúncias recebidas. Com ele, o resumo mostra "· nenhuma denúncia" / "· N denúncias". */
  reportCount?: number;
  untilDate?: never;
};

type SuspendedUserRowProps = AdminUserRowBase & {
  moderationStatus: 'SUSPENDED';
  /** Data até quando a suspensão está ativa (ex.: "12/10"). */
  untilDate: string;
  /** Número de denúncias recebidas. */
  reportCount: number;
  eventCount?: never;
};

type BannedUserRowProps = AdminUserRowBase & {
  moderationStatus: 'BANNED';
  /** Data em que o banimento foi aplicado (ex.: "02/09"). */
  untilDate: string;
  /** Número de denúncias recebidas. */
  reportCount: number;
  eventCount?: never;
};

export type AdminUserRowProps =
  | ActiveUserRowProps
  | SuspendedUserRowProps
  | BannedUserRowProps;
