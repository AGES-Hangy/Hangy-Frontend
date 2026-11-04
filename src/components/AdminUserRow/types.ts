/** Status de moderação de um usuário — eixo de variante do AdminUserRow. */
export type ModerationStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

type AdminUserRowBase = {
  /** Nome completo do usuário. */
  name: string;
  /** Foto do usuário. Sem ela, o Avatar mostra o ícone padrão de pessoa. */
  avatarUri?: string;
  /** Chamado ao tocar na linha. */
  onPress: () => void;
};

type ActiveUserRowProps = AdminUserRowBase & {
  moderationStatus: 'ACTIVE';
  /** Quantidade de eventos criados pelo usuário. */
  eventCount: number;
  untilDate?: never;
  reportCount?: never;
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
