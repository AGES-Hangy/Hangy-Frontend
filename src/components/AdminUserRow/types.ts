/** Status de moderação de um usuário — eixo de variante do AdminUserRow. */
export type ModerationStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export type AdminUserRowProps = {
  /** Nome completo do usuário. */
  name: string;
  /** Texto resumido abaixo do nome (email, tags, localização, etc.). */
  summary?: string;
  /** Foto do usuário. Sem ela, o Avatar mostra o ícone padrão de pessoa. */
  avatarUri?: string;
  /** Status de moderação da conta — define a variante do Badge. */
  moderationStatus: ModerationStatus;
  /** Chamado ao tocar na linha. */
  onPress: () => void;
};
