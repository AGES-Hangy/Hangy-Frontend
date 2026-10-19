import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { SectionHeader } from '@/components/SectionHeader';
import { SettingsLinkRow } from '@/components/SettingsLinkRow';
import { SettingsRow } from '@/components/SettingsRow';
import { useToast } from '@/components/Toast';
import { spacing } from '@/constants/layout';
import { useLocationPermission } from '@/hooks/useLocationPermission';

const LOCATION_ON_DESCRIPTION = 'Permitida · eventos perto de você';
const LOCATION_OFF_DESCRIPTION = 'Desativada · ative para ver eventos perto de você';

/**
 * Seção "Privacidade e permissões" de Editar perfil. Age na hora, sem passar
 * pelo "Salvar alterações". A linha de localização some na Web.
 */
export function PermissionsSection() {
  const { status, canAskAgain, request } = useLocationPermission();
  const { showErrorToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const isGranted = status === 'granted';
  const isBlocked = status === 'denied' && !canAskAgain;

  async function handleLocationToggle() {
    // Revogar só nos ajustes do aparelho.
    if (isGranted) {
      void Linking.openSettings();
      return;
    }
    if (isBusy) return;
    setIsBusy(true);
    try {
      await request();
    } catch {
      showErrorToast('Não foi possível pedir a permissão. Tente de novo.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="PRIVACIDADE E PERMISSÕES" variant="overline" />
      {status !== 'unsupported' && (
        <SettingsRow
          icon="map-pin"
          title="Localização"
          description={isGranted ? LOCATION_ON_DESCRIPTION : LOCATION_OFF_DESCRIPTION}
          state={isBlocked ? 'Blocked' : isGranted ? 'On' : 'Off'}
          onToggle={() => void handleLocationToggle()}
          disabled={status === null || isBusy || isBlocked}
          blockedDescription="Bloqueada nos ajustes do aparelho"
          actionLabel="Abrir ajustes"
          onActionPress={() => void Linking.openSettings()}
        />
      )}
      <SettingsLinkRow
        icon="users"
        title="Usuários bloqueados"
        description="Quem você bloqueou não vê seu perfil"
        onPress={() => router.push('/BlockedUsers')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[4],
  },
});