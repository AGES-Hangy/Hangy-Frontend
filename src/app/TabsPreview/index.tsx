import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileTabs } from '@/components/ProfileTabs';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';

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

export default function TabsPreview() {
  const [segmentedTab, setSegmentedTab] = useState<SegmentedTab>('history');
  const [underlineTab, setUnderlineTab] = useState<UnderlineTab>('created');

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[24],
    paddingHorizontal: spacing[16],
    backgroundColor: colors.bg.subtle,
  },
});
