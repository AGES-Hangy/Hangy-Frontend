import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';

/** Altura do botão LG — o rodapé do Figma tem 84: 16 + 52 + 16. */
const BUTTON_HEIGHT = 52;

/**
 * Espaço que o conteúdo rolável precisa reservar no fim para a última linha
 * não ficar escondida atrás do botão (sem contar a safe area).
 */
export const FLOATING_SAVE_BUTTON_HEIGHT = BUTTON_HEIGHT + spacing[16] * 2;

export type FloatingSaveButtonProps = {
  /** Padrão: "Salvar alterações". */
  label?: string;
  onPress: () => void;
  /** Estado `Disabled` do Figma: sem alteração ou com erro de validação. */
  disabled?: boolean;
  /** Envio em voo: spinner no botão, toque bloqueado. */
  isLoading?: boolean;
};

/**
 * Botão de salvar fixo no rodapé, sempre visível com o conteúdo rolando por
 * baixo — FloatingSaveButton da Sprint 3 Components. Renderize como último
 * filho do container da tela (ele se posiciona em absoluto).
 */
export function FloatingSaveButton({
  label = 'Salvar alterações',
  onPress,
  disabled = false,
  isLoading = false,
}: FloatingSaveButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: spacing[16] + insets.bottom }]}
      pointerEvents="box-none"
    >
      {/* A sombra fica num wrapper: o Button recorta o próprio conteúdo
          (`overflow: hidden`), o que no iOS cortaria a sombra junto. */}
      <View style={styles.shadow}>
        <Button
          label={label}
          onPress={onPress}
          disabled={disabled}
          isLoading={isLoading}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
  },
  shadow: {
    borderRadius: radius.full,
    backgroundColor: colors.bg.base,
    ...elevation[3],
  },
  button: {
    alignSelf: 'stretch',
  },
});
