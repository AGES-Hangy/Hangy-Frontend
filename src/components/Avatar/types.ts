import type { ImageProps } from 'expo-image';
import type { StyleProp, ViewStyle } from 'react-native';

/** Tipo de conteúdo exibido quando não existe uma foto. */
export type AvatarVariant = 'User' | 'Store';

/** Diâmetros 48 / 64 / 80 / 112 / 160 do componente de usuário no Figma. */
export type AvatarSize = 'XS' | 'SM' | 'MD' | 'LG' | 'XL';

/** A loja aparece somente nos três tamanhos desenhados no Figma. */
export type StoreAvatarSize = Extract<AvatarSize, 'MD' | 'LG' | 'XL'>;

type AvatarBaseProps = {
  /**
   * Foto local ou remota. Aceita os mesmos formatos de `source` do
   * `expo-image`, inclusive URL, `require(...)` e fontes responsivas.
   */
  source?: ImageProps['source'];
  /**
   * Descrição da pessoa ou loja para leitores de tela, por exemplo
   * "Foto de Ana". Sem o label, o avatar é tratado como decorativo.
   */
  accessibilityLabel?: string;
  /**
   * Exibe a variação com câmera e torna a câmera acionável. O componente
   * cuida do tamanho visual e da área mínima de toque.
   */
  onCameraPress?: () => void;
  /** Padrão: "Alterar foto". */
  cameraAccessibilityLabel?: string;
  /** Escape hatch somente para posicionamento externo. */
  style?: StyleProp<ViewStyle>;
};

type UserAvatarProps = AvatarBaseProps & {
  variant?: 'User';
  size?: AvatarSize;
};

type StoreAvatarProps = AvatarBaseProps & {
  variant: 'Store';
  size?: StoreAvatarSize;
};

/**
 * União discriminada: impede combinações de loja que não existem no Figma,
 * sem limitar os cinco tamanhos disponíveis para usuário.
 */
export type AvatarProps = UserAvatarProps | StoreAvatarProps;
