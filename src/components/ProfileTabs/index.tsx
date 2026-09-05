import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfileTabsProps } from '@/components/ProfileTabs/types';
import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * Navegação controlada com aparência segmentada ou cabeçalho de lista (indicador inferior).
 *
 * ```tsx
 * const items = [
 *   { value: 'created', label: 'Criados' },
 *   { value: 'confirmed', label: 'Confirmados' },
 *   { value: 'favorites', label: 'Favoritos' },
 * ] as const;
 *
 * <ProfileTabs items={items} value={tab} onChange={setTab} variant="listHeader" />
 * ```
 */
export function ProfileTabs<Value extends string>({
  items,
  value,
  onChange,
  variant = 'segmented',
  style,
}: ProfileTabsProps<Value>) {
  const isListHeader = variant === 'listHeader';

  return (
    <View
      style={[
        styles.container,
        isListHeader ? styles.listHeaderContainer : styles.segmentedContainer,
        style,
      ]}
      accessibilityRole="tablist"
    >
      {items.map((tab) => {
        const isSelected = tab.value === value;
        const isDisabled = isSelected || tab.disabled;

        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            disabled={isDisabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled: tab.disabled }}
            style={({ pressed }) => [
              styles.tab,
              isListHeader ? styles.listHeaderTab : styles.segmentedTab,
              isSelected &&
                (isListHeader ? styles.selectedListHeaderTab : styles.selectedSegmentedTab),
              pressed &&
                (isListHeader ? styles.pressedListHeaderTab : styles.pressedSegmentedTab),
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isListHeader ? styles.listHeaderLabel : styles.segmentedLabel,
                isSelected &&
                  (isListHeader ? styles.selectedListHeaderLabel : styles.selectedSegmentedLabel),
                tab.disabled && styles.disabledLabel,
              ]}
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
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  segmentedContainer: {
    height: 44,
    padding: spacing[4],
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  listHeaderContainer: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  tab: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTab: {
    flex: 1,
    height: 36,
    borderRadius: radius.full,
  },
  listHeaderTab: {
    flex: 1,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedSegmentedTab: {
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...elevation[1],
  },
  selectedListHeaderTab: {
    borderBottomColor: colors.action.primary,
  },
  pressedSegmentedTab: {
    backgroundColor: palette.neutral[200],
  },
  pressedListHeaderTab: {
    backgroundColor: palette.primary[50],
  },
  label: {
    ...typography.labelM,
  },
  segmentedLabel: {
    color: palette.neutral[500],
  },
  listHeaderLabel: {
    color: colors.text.secondary,
  },
  selectedSegmentedLabel: {
    color: palette.primary[600],
  },
  selectedListHeaderLabel: {
    color: colors.text.brand,
  },
  disabledLabel: {
    color: colors.text.disabled,
  },
});

export type {
  ProfileTabItem,
  ProfileTabsProps,
  ProfileTabsVariant,
} from '@/components/ProfileTabs/types';
