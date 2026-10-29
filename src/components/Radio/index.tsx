import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RadioProps } from '@/components/Radio/types';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const RING_SIZE = 22;
const DOT_SIZE = 10;
const BORDER_WIDTH = 1.8;
const MIN_TOUCH_SIZE = 44;

type Visual = {
	borderColor: string;
	dotColor: string;
	labelColor: string;
};

const VISUALS: Record<'unselected' | 'selected' | 'disabled' | 'disabledSelected', Visual> = {
	unselected: {
		borderColor: colors.border.strong,
		dotColor: 'transparent',
		labelColor: colors.text.primary,
	},
	selected: {
		borderColor: colors.action.primary,
		dotColor: colors.action.primary,
		labelColor: colors.text.primary,
	},
	disabled: {
		borderColor: palette.neutral[200],
		dotColor: 'transparent',
		labelColor: colors.text.disabled,
	},
	disabledSelected: {
		borderColor: palette.neutral[200],
		dotColor: palette.neutral[200],
		labelColor: colors.text.disabled,
	},
};

function getVisualState(selected: boolean, disabled: boolean) {
	if (disabled) return selected ? 'disabledSelected' : 'disabled';
	return selected ? 'selected' : 'unselected';
}

export function Radio({
	selected = false,
	disabled = false,
	label,
	onChange,
}: RadioProps) {
	const visual = VISUALS[getVisualState(selected, disabled)];
	const verticalHitSlop = Math.max(0, (MIN_TOUCH_SIZE - RING_SIZE) / 2);

	return (
		<Pressable
			onPress={() => !disabled && onChange?.(!selected)}
			disabled={disabled}
			accessibilityRole="radio"
			accessibilityLabel={label ?? 'Radio'}
			accessibilityState={{ checked: selected, disabled }}
			hitSlop={verticalHitSlop}
			style={styles.container}
		>
			<View
				style={[
					styles.ring,
					{
						borderColor: visual.borderColor,
					},
				]}
			>
				{selected ? (
					<View style={[styles.dot, { backgroundColor: visual.dotColor }]} />
				) : null}
			</View>
			{label ? (
				<Text style={[typography.bodyL, styles.label, { color: visual.labelColor }]}>
					{label}
				</Text>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		minHeight: MIN_TOUCH_SIZE,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing[8],
	},
	ring: {
		width: RING_SIZE,
		height: RING_SIZE,
		borderRadius: radius.full,
		borderWidth: BORDER_WIDTH,
		backgroundColor: colors.bg.base,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: {
		width: DOT_SIZE,
		height: DOT_SIZE,
		borderRadius: radius.full,
	},
	label: {
		flexShrink: 1,
	},
});

export type { RadioProps } from '@/components/Radio/types';
