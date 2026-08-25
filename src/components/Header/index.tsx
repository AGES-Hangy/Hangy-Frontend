import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { colors } from '@/constants/colors';

export function Header() {
  const canGoBack = router.canGoBack();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconButton, !canGoBack && styles.iconButtonHidden]}
          disabled={!canGoBack}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.action.secondary} />
        </Pressable>

        <Image
          source={require('../../../assets/images/logo.svg')}
          style={styles.logo}
          contentFit="contain"
        />

        <Pressable
          onPress={() => router.push('/Notifications')}
          style={styles.iconButton}
          hitSlop={8}
        >
          <MaterialIcons name="notifications" size={24} color={colors.action.secondary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.action.primary
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 12,
    backgroundColor: colors.action.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonHidden: {
    opacity: 0,
  },
  logo: {
    width: 100,
    height: 32,
  },
});
