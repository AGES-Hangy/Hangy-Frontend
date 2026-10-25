import type { ReactNode, RefObject } from 'react';
import type { TextInstance, ViewInstance } from 'react-native';

export type ProfileHeaderStat = {
  value: number;
  /** Já no singular ou no plural: "Conexão", "Seguidores". */
  label: string;
  /** Torna o número um botão, ex.: Conexões abre `/Connections`. */
  onPress?: () => void;
  /** Nome acessível do botão; padrão: "{valor} {label}". */
  accessibilityLabel?: string;
};

export type ProfileHeaderProps = {
  photoUrl: string | null;
  /** Como o `Avatar`: `Store` para estabelecimento. */
  avatarVariant: 'User' | 'Store';
  stats: ProfileHeaderStat[];
  name: string | null;
  /**
   * Onde a tela põe o foco quando o botão de ação some: o título com o nome
   * ou, sem nome, o contêiner do cabeçalho.
   */
  focusRef?: RefObject<ViewInstance | TextInstance | null>;
  description: string | null;
  tags: Array<{ id: string; name: string }>;
  /** Slot de ações (relacionamento, Editar perfil); sem ele, a linha some. */
  actions?: ReactNode;
};
