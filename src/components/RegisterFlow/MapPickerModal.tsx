import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useAddressSearch, type AddressSuggestion } from '@/hooks/useAddressSearch';

/**
 * Porto Alegre — só o ponto de partida do mapa antes da busca ou do GPS
 * responderem, não tem significado além disso.
 */
const DEFAULT_REGION = {
  latitude: -30.0346,
  longitude: -51.2177,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (suggestion: AddressSuggestion) => void;
};

/**
 * Aberto pelo ícone do campo Endereço (aba Empresa). Pino fixo no centro — é
 * o mapa que se move por baixo — pra não depender de marker arrastável.
 * `LocationPicker` genérico (US3.1/US7.5) ainda não existe; isto fica local
 * ao cadastro por ora.
 *
 * Só esta versão (`.tsx`, iOS/Android) importa `react-native-maps` — o
 * pacote quebra o bundle inteiro na web (importa internals nativos do RN que
 * não existem lá), então a web usa `MapPickerModal.web.tsx`, que nem chega a
 * importar o pacote.
 */
export function MapPickerModal({ visible, onClose, onConfirm }: Props) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [query, setQuery] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { results, search, reverseGeocode } = useAddressSearch();

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({});
      const nextRegion = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 500);
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectSuggestion(suggestion: AddressSuggestion) {
    const nextRegion = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 500);
  }

  async function handleConfirm() {
    const suggestion = await reverseGeocode(region.latitude, region.longitude);
    if (suggestion) onConfirm(suggestion);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.searchBar}>
          <TextField
            type="Location"
            label="Buscar endereço"
            placeholder="Digite um endereço"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              search(text);
            }}
            options={results.map((result, index) => ({ value: String(index), label: result.label }))}
            onSelectOption={(option) => {
              const suggestion = results.find((result) => result.label === option.label);
              if (suggestion) {
                setQuery(suggestion.label);
                handleSelectSuggestion(suggestion);
              }
            }}
          />
        </View>

        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
          />
          <View pointerEvents="none" style={styles.centerPin}>
            <Icon name="map-pin" size={36} color={palette.primary[600]} fill={palette.primary[100]} />
          </View>
        </View>

        <View style={styles.footer}>
          {permissionDenied && (
            <Text style={styles.permissionText}>
              Sem permissão de localização — busque o endereço por texto acima.
            </Text>
          )}
          <Button
            label="Usar minha localização atual"
            variant="Secondary"
            icon="compass"
            onPress={handleUseCurrentLocation}
            isLoading={isLocating}
          />
          <View style={styles.footerRow}>
            <Button label="Cancelar" variant="Tertiary" onPress={onClose} style={styles.footerButton} />
            <Button label="Confirmar localização" onPress={handleConfirm} style={styles.footerButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  searchBar: {
    padding: spacing[16],
    paddingBottom: spacing[8],
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -36,
  },
  footer: {
    padding: spacing[16],
    gap: spacing[12],
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  footerButton: {
    flex: 1,
  },
  permissionText: {
    ...typography.bodyS,
    color: palette.neutral[500],
    textAlign: 'center',
  },
});
