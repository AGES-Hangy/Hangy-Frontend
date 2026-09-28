import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { AddressSuggestion } from '@/hooks/useAddressSearch';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (suggestion: AddressSuggestion) => void;
};

/**
 * Versão web (Metro resolve `.web.tsx` antes de `.tsx` nesta plataforma) —
 * `react-native-maps` não roda no navegador (importa internals nativos do
 * RN), então aqui só existe o aviso; a busca por texto do campo Endereço
 * continua funcionando normalmente fora deste modal.
 */
export function MapPickerModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.container}>
        <Text style={styles.text}>
          Selecionar no mapa está disponível só no app (Android/iOS). Use a busca por texto no
          campo Endereço.
        </Text>
        <Button label="Fechar" variant="Secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[16],
    padding: spacing[24],
    backgroundColor: colors.bg.base,
  },
  text: {
    ...typography.bodyL,
    textAlign: 'center',
  },
});
