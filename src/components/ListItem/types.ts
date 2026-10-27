import type { ReactNode } from 'react';

/** Person usa o avatar redondo; Business, o quadrado com raio radius/md. */
export type ListItemType = 'Person' | 'Business';

export type ListItemProps = {
  /** Forma do avatar. */
  type: ListItemType;
  /** Nome principal da pessoa ou do estabelecimento. */
  name: string;
  /** Cidade, tags ou contexto, ex.: "Cafeteria · Cidade Baixa · 1,2 km". */
  subtitle?: string;
  /** Foto. Sem ela, o Avatar mostra o ícone de pessoa ou loja. */
  avatarUri?: string;
  /**
   * Ação à direita (seguir, conectar). Substitui o chevron e fica fora da área
   * tocável da linha, para não aninhar botões.
   */
  trailing?: ReactNode;
  /** Abre o perfil. */
  onPress: () => void;
};
