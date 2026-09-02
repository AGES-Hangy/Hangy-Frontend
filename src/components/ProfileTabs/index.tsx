import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfileTab, ProfileTabsProps } from '@/components/ProfileTabs/types';
import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const TABS: ReadonlyArray<{ value: ProfileTab; label: string }> = [
  { value: 'history', label: 'Histórico' },
  { value: 'events', label: 'Meus Eventos' },
  { value: 'gallery', label: 'Galeria' },
];

/**
 * Navegação segmentada do perfil, conforme as três variações do Figma.
 *
 * ```tsx
 * const [tab, setTab] = useState<ProfileTab>('history');
 * <ProfileTabs value={tab} onChange={setTab} />
 * ```
 */
export function ProfileTabs({ value, onChange, style }: ProfileTabsProps) {
  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isSelected = tab.value === value;

        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.selectedTab,
              pressed && styles.pressedTab,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, isSelected && styles.selectedLabel]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 44,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  tab: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  selectedTab: {
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...elevation[1],
  },
  pressedTab: {
    backgroundColor: palette.neutral[200],
  },
  label: {
    ...typography.labelM,
    color: palette.neutral[500],
  },
  selectedLabel: {
    color: palette.primary[600],
  },
});

export type { ProfileTab, ProfileTabsProps } from '@/components/ProfileTabs/types';
