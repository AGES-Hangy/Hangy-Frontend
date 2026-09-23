import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { CheckboxProps } from '@/components/Checkbox/types';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const BOX_SIZE = 22;
const CHECK_ICON_SIZE = 16;
const BORDER_WIDTH = 1.8;
const MIN_TOUCH_SIZE = 44;
const INDETERMINATE_BAR_WIDTH = 12;
const INDETERMINATE_BAR_HEIGHT = 2;

type Visual = {
	backgroundColor: string;
	borderColor: string;
	contentColor: string;
	labelColor: string;
};

const VISUALS: Record<
		'unchecked' | 'checked' | 'indeterminate' | 'disabled' | 'disabledChecked',
		Visual
	> = {
	unchecked: {
		backgroundColor: colors.bg.base,
		borderColor: colors.border.strong,
		contentColor: colors.text.inverse,
		labelColor: colors.text.primary,
	},
	checked: {
		backgroundColor: colors.action.primary,
		borderColor: colors.action.primary,
		contentColor: colors.text.inverse,
		labelColor: colors.text.primary,
	},
	indeterminate: {
		backgroundColor: colors.action.primary,
		borderColor: colors.action.primary,
		contentColor: colors.text.inverse,
		labelColor: colors.text.primary,
	},
	disabled: {
		backgroundColor: colors.bg.base,
		borderColor: palette.neutral[200],
		contentColor: colors.text.disabled,
		labelColor: colors.text.disabled,
	},
	disabledChecked: {
		backgroundColor: palette.neutral[200],
		borderColor: palette.neutral[200],
		contentColor: colors.bg.base,
		labelColor: colors.text.disabled,
	},
};

function getVisualState(checked: boolean, indeterminate: boolean, disabled: boolean) {
	if (disabled) return checked || indeterminate ? 'disabledChecked' : 'disabled';
	if (indeterminate) return 'indeterminate';
	return checked ? 'checked' : 'unchecked';
}

export function Checkbox({
	checked = false,
	indeterminate = false,
	disabled = false,
	label,
	onChange,
}: CheckboxProps) {
	const visual = VISUALS[getVisualState(checked, indeterminate, disabled)];
	const verticalHitSlop = Math.max(0, (MIN_TOUCH_SIZE - BOX_SIZE) / 2);

	return (
		<Pressable
			onPress={() => !disabled && onChange?.(!checked)}
			disabled={disabled}
			accessibilityRole="checkbox"
			accessibilityLabel={label ?? 'Checkbox'}
			accessibilityState={{ checked: indeterminate ? false : checked, disabled }}
			hitSlop={verticalHitSlop}
			style={styles.container}
		>
			<View
				style={[
					styles.box,
					{
						backgroundColor: visual.backgroundColor,
						borderColor: visual.borderColor,
					},
				]}
			>
				{indeterminate ? (
					<View
						style={[
							styles.indeterminateBar,
							{ backgroundColor: visual.contentColor },
						]}
					/>
				) : checked ? (
					<Icon name="check" size={CHECK_ICON_SIZE} color={visual.contentColor} strokeWidth={2} />
				) : null}
			</View>
			{label ? <Text style={[typography.bodyL, styles.label, { color: visual.labelColor }]}>{label}</Text> : null}
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
	box: {
		width: BOX_SIZE,
		height: BOX_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: BORDER_WIDTH,
		borderRadius: radius.xs,
	},
	indeterminateBar: {
		width: INDETERMINATE_BAR_WIDTH,
		height: INDETERMINATE_BAR_HEIGHT,
		borderRadius: radius.full,
	},
	label: {
		flexShrink: 1,
	},
});

export type { CheckboxProps } from '@/components/Checkbox/types';
