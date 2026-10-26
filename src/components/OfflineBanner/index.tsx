import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { elevation, layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export function OfflineBanner() {
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel="Sem conexão com a internet"
      style={styles.banner}
    >
      <Icon name="circle-alert" size={layout.notificationItem.fallbackIconSize} color={palette.warning.default} />
      <Text style={styles.label}>Sem conexão com a internet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: spacing[8],
    left: spacing[16],
    right: spacing[16],
    zIndex: layout.eventCard.overlayZIndex,
    minHeight: spacing[48],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.md,
    backgroundColor: palette.warning.bg,
    ...elevation[2],
  },
  label: {
    ...typography.labelM,
    flexShrink: 1,
    color: colors.text.primary,
  },
});
