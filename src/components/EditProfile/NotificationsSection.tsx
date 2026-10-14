import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/SectionHeader';
import { SettingsRow } from '@/components/SettingsRow';
import { useToast } from '@/components/Toast';
import { spacing } from '@/constants/layout';
import { usePushPermission } from '@/hooks/usePushPermission';
import { useRegisterDevice } from '@/hooks/useRegisterDevice';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { fetchExpoPushToken } from '@/utils/expoPushToken';
import { getPushToken, isPushOptedOut, setPushOptOut } from '@/utils/pushToken';

/**
 * Toggle de notificações push de Editar perfil. Age na hora, sem passar pelo
 * "Salvar alterações": ligar pede a permissão do aparelho e registra o token
 * no backend; desligar apaga o token de lá. Some em plataforma sem push (Web).
 */
export function NotificationsSection() {
  const { status, canAskAgain, request } = usePushPermission();
  const { registerDevice } = useRegisterDevice();
  const { unregisterDevice } = useUnregisterDevice();
  const { showErrorToast } = useToast();

  /** `null` enquanto lê o token salvo. */
  const [isOn, setIsOn] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (status === null || status === 'unsupported') return;
    if (status !== 'granted') {
      // Permissão retirada nos ajustes com o app aberto: o Switch acompanha.
      setIsOn(false);
      return;
    }

    let isCurrent = true;
    void Promise.all([getPushToken(), isPushOptedOut()]).then(([token, optedOut]) => {
      if (isCurrent) setIsOn((current) => current ?? (Boolean(token) && !optedOut));
    });

    return () => {
      isCurrent = false;
    };
  }, [status]);

  if (status === 'unsupported') return null;

  async function turnOn() {
    const permission = status === 'granted' ? 'granted' : await request();
    // Negada: sem toast — a linha vira Blocked, com o atalho para os ajustes.
    if (permission !== 'granted') return;

    const token = await fetchExpoPushToken();
    if (!token || !(await registerDevice(token))) {
      showErrorToast('Não foi possível ativar as notificações. Tente de novo.');
      return;
    }

    await setPushOptOut(false);
    setIsOn(true);
  }

  async function turnOff() {
    if (!(await unregisterDevice())) {
      showErrorToast('Não foi possível desativar as notificações. Tente de novo.');
      return;
    }

    await setPushOptOut(true);
    setIsOn(false);
  }

  async function handleToggle(checked: boolean) {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await (checked ? turnOn() : turnOff());
    } catch {
      showErrorToast('Não foi possível alterar as notificações. Tente de novo.');
    } finally {
      setIsBusy(false);
    }
  }

  // iOS e Android não repetem o prompt depois de negado em definitivo.
  const isBlocked = status === 'denied' && !canAskAgain;

  return (
    <View style={styles.section}>
      <SectionHeader title="NOTIFICAÇÕES" variant="overline" />
      <SettingsRow
        icon="bell"
        title="Notificações push"
        description="Convites, mensagens e eventos"
        state={isBlocked ? 'Blocked' : isOn ? 'On' : 'Off'}
        onToggle={(checked) => void handleToggle(checked)}
        disabled={isBusy || isOn === null || isBlocked}
        blockedDescription="Bloqueadas nos ajustes do aparelho"
        actionLabel="Abrir ajustes"
        onActionPress={() => void Linking.openSettings()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[4],
  },
});
