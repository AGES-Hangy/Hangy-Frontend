import type { ImageProps } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';

import type { AvatarVariant } from '@/components/Avatar';

/** Dados de cada participante mostrados no grupo. */
export type AvatarGroupItem = {
  /** Foto local ou remota, no mesmo formato aceito por `Avatar`. */
  source?: ImageProps['source'];
  /** Fallback usado quando não houver foto. Padrão: `User`. */
  variant?: AvatarVariant;
  accessibilityLabel?: string;
};

export type AvatarGroupProps = {
  /** Participantes na ordem em que serão exibidos. */
  avatars: readonly AvatarGroupItem[];
  /** Rótulo do grupo para tecnologias assistivas. */
  accessibilityLabel?: string;
  /** Diâmetro de cada avatar. Padrão: 40 (a pilha MD do Figma). */
  size?: number;
  /** Quanto um avatar sobrepõe o anterior. Padrão: 14. */
  overlap?: number;
  /** Ajustes de posicionamento externo. */
  style?: StyleProp<ViewStyle>;
};
