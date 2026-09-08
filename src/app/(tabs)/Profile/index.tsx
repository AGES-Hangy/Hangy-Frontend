import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTopAppBar } from '@/hooks/useTopAppBar';
import { colors } from '@/constants/colors';

export default function Profile() {
  // Sem `userId` é o perfil próprio; com, é o de outra pessoa ou de um
  // estabelecimento. O nome vem por parâmetro por enquanto — quando existir a
  // API de perfil, sai de um hook em `src/hooks/` no lugar disto.
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  const isOwnProfile = !userId;

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
});
