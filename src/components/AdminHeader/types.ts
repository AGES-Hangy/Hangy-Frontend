import type { ReactNode } from 'react';

export type AdminHeaderProps = {
  title: string;
  /** Ação à direita do título (ex.: "Sair" no Painel). */
  action?: ReactNode;
};
