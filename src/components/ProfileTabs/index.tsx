import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProfileTabsProps } from '@/components/ProfileTabs/types';
import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/**
 * Navegação controlada com aparência segmentada ou indicador inferior.
 *
 * ```tsx
 * const items = [
 *   { value: 'created', label: 'Criados' },
 *   { value: 'confirmed', label: 'Confirmados' },
 *   { value: 'favorites', label: 'Favoritos' },
 * ] as const;
 *
 * <ProfileTabs items={items} value={tab} onChange={setTab} variant="underline" />
 * ```
 */
export function ProfileTabs<Value extends string>({
  items,
  value,
  onChange,
  variant = 'segmented',
  style,
}: ProfileTabsProps<Value>) {
  const isUnderline = variant === 'underline';

  return (
    <View
      style={[
        styles.container,
        isUnderline ? styles.underlineContainer : styles.segmentedContainer,
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
              isUnderline ? styles.underlineTab : styles.segmentedTab,
              isSelected &&
                (isUnderline ? styles.selectedUnderlineTab : styles.selectedSegmentedTab),
              pressed &&
                (isUnderline ? styles.pressedUnderlineTab : styles.pressedSegmentedTab),
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isUnderline ? styles.underlineLabel : styles.segmentedLabel,
                isSelected &&
                  (isUnderline ? styles.selectedUnderlineLabel : styles.selectedSegmentedLabel),
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
  underlineContainer: {
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
  underlineTab: {
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
  selectedUnderlineTab: {
    borderBottomColor: colors.action.primary,
  },
  pressedSegmentedTab: {
    backgroundColor: palette.neutral[200],
  },
  pressedUnderlineTab: {
    backgroundColor: palette.primary[50],
  },
  label: {
    ...typography.labelM,
  },
  segmentedLabel: {
    color: palette.neutral[500],
  },
  underlineLabel: {
    color: colors.text.secondary,
  },
  selectedSegmentedLabel: {
    color: palette.primary[600],
  },
  selectedUnderlineLabel: {
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
