import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileTabs } from '@/components/ProfileTabs';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const SEGMENTED_TABS = [
  { value: 'history', label: 'Histórico' },
  { value: 'events', label: 'Meus Eventos' },
  { value: 'gallery', label: 'Galeria' },
] as const;

const UNDERLINE_TABS = [
  { value: 'created', label: 'Criados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'favorites', label: 'Favoritos' },
] as const;

type SegmentedTab = (typeof SEGMENTED_TABS)[number]['value'];
type UnderlineTab = (typeof UNDERLINE_TABS)[number]['value'];

export default function Profile() {
  const [segmentedTab, setSegmentedTab] = useState<SegmentedTab>('history');
  const [underlineTab, setUnderlineTab] = useState<UnderlineTab>('created');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Perfil</Text>

        <ProfileTabs
          items={SEGMENTED_TABS}
          value={segmentedTab}
          onChange={setSegmentedTab}
          variant="segmented"
        />

        <ProfileTabs
          items={UNDERLINE_TABS}
          value={underlineTab}
          onChange={setUnderlineTab}
          variant="underline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[32],
    backgroundColor: colors.bg.subtle,
  },
  content: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing[24],
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
});
