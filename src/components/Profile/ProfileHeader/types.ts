import type { ReactNode } from 'react';

export type ProfileHeaderStat = {
  value: number;
  /** Já no singular ou no plural: "Conexão", "Seguidores". */
  label: string;
};

export type ProfileHeaderProps = {
  photoUrl: string | null;
  /** Como o `Avatar`: `Store` para estabelecimento. */
  avatarVariant: 'User' | 'Store';
  stats: ProfileHeaderStat[];
  name: string | null;
  description: string | null;
  tags: Array<{ id: string; name: string }>;
  /** Slot de ações (relacionamento, Editar perfil); sem ele, a linha some. */
  actions?: ReactNode;
};
