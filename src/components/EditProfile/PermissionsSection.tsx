import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { SettingsLinkRow } from '@/components/SettingsLinkRow';
import { SettingsRow } from '@/components/SettingsRow';
import { useToast } from '@/components/Toast';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useLocationPermission } from '@/hooks/useLocationPermission';

const LOCATION_ON_DESCRIPTION = 'Permitida · eventos perto de você';
const LOCATION_OFF_DESCRIPTION = 'Desativada · ative para ver eventos perto de você';

/**
 * Seção "Privacidade e permissões" de Editar perfil. Age na hora, sem passar
 * pelo "Salvar alterações". A linha de localização some na Web.
 */
export function PermissionsSection() {
  const { status, canAskAgain, error, isRefreshing, refresh, request } = useLocationPermission();
  const { showErrorToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  const isGranted = status === 'granted';
  const isBlocked = status === 'denied' && !canAskAgain;
  const description = error
    ? 'Permissão indisponível'
    : status === null
      ? 'Consultando permissão de localização'
      : isGranted ? LOCATION_ON_DESCRIPTION : LOCATION_OFF_DESCRIPTION;

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
          description={description}
          state={isBlocked ? 'Blocked' : isGranted ? 'On' : 'Off'}
          onToggle={() => void handleLocationToggle()}
          disabled={status === null || isBusy || isRefreshing || Boolean(error) || isBlocked}
          blockedDescription="Bloqueada nos ajustes do aparelho"
          actionLabel="Abrir ajustes"
          onActionPress={() => void Linking.openSettings()}
        />
      )}
      {error && (
        <View style={styles.section}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Button
            label="Tentar localização novamente"
            variant="Secondary"
            onPress={() => void refresh()}
            isLoading={isRefreshing}
          />
        </View>
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
  error: {
    ...typography.bodyS,
    color: colors.action.danger,
  },
  section: {
    gap: spacing[4],
  },
});
