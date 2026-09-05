import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import type { AvatarSize, StoreAvatarSize } from '@/components/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const profilePhoto = require('../../../../assets/images/avatar-mock.jpeg');

const USER_SIZES: AvatarSize[] = ['XS', 'SM', 'MD', 'LG', 'XL'];
const STORE_SIZES: StoreAvatarSize[] = ['MD', 'LG', 'XL'];

/** Vitrine temporária do componente Avatar. */
export default function Profile() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Avatar</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Com foto</Text>
        <View style={styles.row}>
          {USER_SIZES.map((size) => (
            <View key={size} style={styles.example}>
              <Avatar
                size={size}
                source={profilePhoto}
                accessibilityLabel="Foto de perfil"
              />
              <Text style={styles.caption}>{size}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fallback de usuário</Text>
        <View style={styles.row}>
          {USER_SIZES.map((size) => (
            <View key={size} style={styles.example}>
              <Avatar size={size} />
              <Text style={styles.caption}>{size}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fallback de loja</Text>
        <View style={styles.row}>
          {STORE_SIZES.map((size) => (
            <View key={size} style={styles.example}>
              <Avatar variant="Store" size={size} />
              <Text style={styles.caption}>{size}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto editável</Text>
        <Avatar
          size="LG"
          source={profilePhoto}
          accessibilityLabel="Foto de perfil"
          onCameraPress={() => Alert.alert('Avatar', 'A câmera foi acionada.')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    padding: spacing[24],
    gap: spacing[32],
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  section: {
    gap: spacing[16],
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: spacing[24],
  },
  example: {
    alignItems: 'center',
    gap: spacing[8],
  },
  caption: {
    ...typography.labelS,
    color: colors.text.secondary,
  },
});
