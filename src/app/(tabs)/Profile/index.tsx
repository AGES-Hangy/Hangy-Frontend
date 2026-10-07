import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTopAppBar } from '@/hooks/useTopAppBar';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { removeToken } from '@/utils/auth';

export default function Profile() {
  // Sem `userId` é o perfil próprio; com, é o de outra pessoa ou de um
  // estabelecimento. O nome vem por parâmetro por enquanto — quando existir a
  // API de perfil, sai de um hook em `src/hooks/` no lugar disto.
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const isOwnProfile = !userId;

  const { user } = useCurrentUser();
  const { unregisterDevice } = useUnregisterDevice();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    // Antes de removeToken porque o DELETE precisa do Bearer. Logout
    // voluntário não deve exibir sessão expirada se a API responder 401.
    await unregisterDevice({ isLoggingOut: true });
    await removeToken();
    router.replace('/Login');
  }

  useTopAppBar(
    isOwnProfile
      ? {
          variant: 'Profile',
          // Numa conta de estabelecimento o título é o nome do estabelecimento
          // em vez de "Meu perfil" — trocar assim que existir o usuário logado.
          title: 'Meu perfil',
          // Raiz de aba: não veio de lugar nenhum, então não tem voltar.
          showBack: false,
        }
      : {
          variant: 'Profile',
          title: name ?? 'Perfil',
          action: {
            icon: 'flag',
            accessibilityLabel: 'Denunciar perfil',
            // A US11.1 pluga o fluxo de denúncia aqui.
            onPress: () => {},
          },
        },
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{isOwnProfile ? 'Profile' : name}</Text>
      {isOwnProfile && (
        <Button
          label="Editar perfil"
          variant="Secondary"
          // A mesma rota para pessoa física e estabelecimento: a variante sai
          // do tipo da conta logada, dentro da tela.
          onPress={() =>
            router.push({ pathname: '/EditProfile', params: user ? { userId: user.userId } : {} })
          }
          style={styles.logout}
        />
      )}
      {isOwnProfile && (
        <Button
          label="Sair"
          variant="Secondary"
          onPress={handleLogout}
          isLoading={isLoggingOut}
          accessibilityLabel="Sair da conta"
          style={styles.logout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.action.primary,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.action.secondary,
  },
  logout: {
    marginTop: spacing[24],
  },
});
