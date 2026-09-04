import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Badge, getPrivacyBadgeLabel, getPrivacyBadgeValue, getStatusBadgeValue } from '@/components/Badge';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { elevation, layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { Event, EventCardProps, EventPrivacy } from './types';

function formatEventDate(value: string) {
	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
		.format(parsedDate)
		.replace('.', '');
}

function formatRequestDate(value: string) {
	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	const parts = new Intl.DateTimeFormat('pt-BR', {
		weekday: 'short',
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(parsedDate);
	const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

	return `${getPart('weekday').replace('.', '')}, ${getPart('day')} ${getPart('month').replace('.', '')}, ${getPart('hour')}h${getPart('minute')}`;
}

const placeholderImage = require('../../../assets/images/hangy.svg');

export function EventCard({
	variant,
	event,
	privacy = 'Publico',
	state = 'Default',
	isNew = false,
	onPress,
}: EventCardProps) {
	const accessibleLabel = `${event.title}, ${formatEventDate(event.date)}, ${event.location}, ${getPrivacyBadgeLabel(privacy)}`;
	const content = { ...event, privacy, date: formatEventDate(event.date) };

	return (
		<Pressable
			accessibilityLabel={accessibleLabel}
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
		>
			{variant === 'Featured' && <FeaturedCard event={content} />}
			{variant === 'Compact' && <CompactCard event={content} state={state} />}
			{variant === 'MapPreview' && <MapPreviewCard event={content} />}
			{variant === 'Mini' && <MiniCard event={content} />}
			{variant === 'Request' && <RequestCard event={content} isNew={isNew} />}
		</Pressable>
	);
}

function EventImage({ event, style }: { event: Event; style: object }) {
	const [hasImageError, setHasImageError] = useState(false);

	return (
		<Image
			accessibilityLabel={`Capa do evento ${event.title}`}
			source={hasImageError ? placeholderImage : event.imageUrl}
			placeholder={placeholderImage}
			onError={() => setHasImageError(true)}
			contentFit="cover"
			transition={layout.eventCard.imageTransitionDuration}
			style={style}
		/>
	);
}

function EventDetails({ event, compact = false }: { event: Event; compact?: boolean }) {
	return (
		<View style={styles.details}>
			<Text numberOfLines={compact ? 1 : 2} style={compact ? styles.compactTitle : styles.title}>{event.title}</Text>
			{compact ? (
				<View style={styles.compactMetaLine}>
					<View style={styles.metaItem}>
						<MaterialIcons name="event" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
					</View>
					<Text style={styles.metaSeparator}>•</Text>
					<View style={styles.metaItem}>
						<MaterialIcons name="place" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
					</View>
				</View>
			) : (
				<>
					<View style={styles.detailLine}>
						<MaterialIcons name="event" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
					</View>
					<View style={styles.detailLine}>
						<MaterialIcons name="place" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
					</View>
				</>
			)}
		</View>
	);
}

function PrivacyTag({ privacy }: { privacy: EventPrivacy }) {
	return (
		<View style={styles.privacyTagWrap}>
			<Badge family="Privacy" value={getPrivacyBadgeValue(privacy)} />
		</View>
	);
}

function FeaturedCard({ event }: { event: Event }) {
	return (
		<View style={[styles.card, styles.featured]}>
			<View style={styles.featuredImageWrap}>
				<EventImage event={event} style={styles.featuredImage} />
				<PrivacyTag privacy={event.privacy} />
			</View>
			<EventDetails event={event} />
		</View>
	);
}

function CompactCard({ event, state }: { event: Event; state: EventCardProps['state'] }) {
	const stateBadge = getStatusBadgeValue(state);

	return (
		<View style={[styles.card, styles.compact]}>
			<View style={styles.compactImageWrap}>
				<EventImage event={event} style={styles.compactImage} />
			</View>
			<View style={styles.compactContent}>
				<EventDetails event={event} compact />
				<View style={styles.compactMeta}>
					<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
				</View>
			</View>
			<View style={styles.compactStateWrap}>
				{stateBadge ? <Badge family="Status" value={stateBadge} /> : <MaterialIcons name="chevron-right" size={layout.eventCard.chevronSize} color={colors.text.tertiary} style={styles.compactChevron} />}
			</View>
		</View>
	);
}

function MapPreviewCard({ event }: { event: Event }) {
	const distance = event.distance ?? '250 metros';

	return (
		<View style={[styles.card, styles.mapPreview]}>
			<View style={styles.mapImageWrap}>
				<EventImage event={event} style={styles.mapImage} />
			</View>
			<View style={styles.mapDetails}>
				<Text numberOfLines={1} style={styles.compactTitle}>{event.title}</Text>
				<Text numberOfLines={1} style={styles.detailText}>a {distance} de você</Text>
				<View style={styles.mapBadgeAbove}>
					<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
				</View>
			</View>
		</View>
	);
}

function MiniCard({ event }: { event: Event }) {
	return (
		<View style={[styles.card, styles.mini]}>
			<View style={styles.miniImageWrap}>
				<EventImage event={event} style={styles.miniImage} />
				<View style={styles.miniBadgeOverlay}>
					<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
				</View>
			</View>
			<View style={styles.miniContent}>
				<Text numberOfLines={2} style={styles.miniTitle}>{event.title}</Text>
				<View style={styles.detailLine}>
					<MaterialIcons name="event" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
				</View>
				<View style={styles.detailLine}>
					<MaterialIcons name="place" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
				</View>
			</View>
		</View>
	);
}

function RequestCard({ event, isNew }: { event: Event; isNew: boolean }) {
	const requesterName = event.requesterName ?? 'Usuário';

	return (
		<View style={[styles.card, styles.mini]}>
			<View style={styles.requestImageWrap}>
				<EventImage event={event} style={styles.requestImage} />
				{isNew ? <View style={styles.newDot} /> : null}
			</View>
			<View style={styles.miniContent}>
				<Text numberOfLines={2} style={styles.miniTitle}>{event.title}</Text>
				<View style={styles.detailLine}>
					<MaterialIcons name="person" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{requesterName} solicitou</Text>
				</View>
				<View style={styles.detailLine}>
					<MaterialIcons name="event" size={layout.eventCard.detailIconSize} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{formatRequestDate(event.date)}</Text>
				</View>
				<View style={styles.requestActions}>
					<Button
						label=""
						icon="check"
						variant="Primary"
						size="SM"
						accessibilityLabel="Aceitar solicitação"
						onPress={() => undefined}
						style={styles.requestButton}
					/>
					<Button
						label=""
						icon="x"
						variant="Secondary"
						size="SM"
						accessibilityLabel="Recusar solicitação"
						onPress={() => undefined}
						style={styles.requestButton}
					/>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pressable: { alignSelf: 'flex-start' },
	pressed: { opacity: layout.eventCard.pressedOpacity },
	card: { overflow: 'visible', backgroundColor: colors.surface.card, borderRadius: radius.md, ...elevation[1] },
	featured: { width: layout.eventCard.featuredWidth, height: layout.eventCard.featuredHeight, borderRadius: radius.lg },
	featuredImageWrap: { height: layout.eventCard.featuredImageHeight, overflow: 'hidden', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
	featuredImage: { width: '100%', height: '100%', backgroundColor: colors.surface.sunken },
	privacyTagWrap: { position: 'absolute', top: spacing[12], left: spacing[12], zIndex: layout.eventCard.overlayZIndex },
	details: { flex: 1, gap: spacing[4], padding: spacing[12] },
	title: { ...typography.h4, color: colors.text.primary },
	compactTitle: { ...typography.labelM, color: colors.text.primary },
	detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
	compactMetaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexWrap: 'wrap' },
	metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexShrink: layout.eventCard.flexShrink },
	metaSeparator: { color: colors.text.tertiary },
	detailText: { ...typography.caption, color: colors.text.secondary, flexShrink: layout.eventCard.flexShrink },
	compact: { width: '100%', maxWidth: layout.eventCard.compactMaxWidth, height: layout.eventCard.compactHeight, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, overflow: 'visible' },
	compactImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
	compactImage: { width: layout.eventCard.compactImageSize, height: layout.eventCard.compactImageSize, backgroundColor: colors.surface.sunken },
	compactContent: { flex: 1, justifyContent: 'center', paddingVertical: spacing[8], paddingRight: spacing[8] },
	compactMeta: { marginTop: spacing[4], alignSelf: 'flex-start', position: 'relative', top: layout.eventCard.compactMetaTop, left: layout.eventCard.compactMetaLeft, right: layout.eventCard.compactMetaRight },
	compactStateWrap: { alignItems: 'center', justifyContent: 'center', paddingRight: spacing[12], minWidth: layout.eventCard.compactStateMinWidth },
	compactChevron: { marginRight: spacing[12] },
	mapPreview: { width: layout.eventCard.mapPreviewWidth, height: layout.eventCard.mapPreviewHeight, flexDirection: 'row', alignItems: 'center', padding: spacing[8], overflow: 'visible' },
	mapImageWrap: { position: 'relative', overflow: 'hidden', borderRadius: radius.eventCardSm },
	mapImage: { width: layout.eventCard.mapImageSize, height: layout.eventCard.mapImageSize, borderRadius: radius.eventCardSm, backgroundColor: colors.surface.sunken },
	mapDetails: { position: 'relative', flex: 1, gap: spacing[4], paddingHorizontal: spacing[8], paddingTop: spacing[8] },
	mapBadgeAbove: { marginTop: spacing[4], alignSelf: 'flex-start' },
	mini: { width: layout.eventCard.miniWidth, height: layout.eventCard.miniHeight, overflow: 'visible' },
	miniImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
	miniImage: { width: '100%', height: layout.eventCard.miniImageHeight, backgroundColor: colors.surface.sunken },
	miniBadgeOverlay: { position: 'absolute', top: spacing[8], left: spacing[8], zIndex: layout.eventCard.overlayZIndex },
	requestImage: { width: '100%', height: layout.eventCard.requestImageHeight, backgroundColor: colors.surface.sunken },
	miniContent: { flex: 1, gap: spacing[4], padding: spacing[8] },
	miniTitle: { ...typography.labelM, color: colors.text.primary, flexShrink: layout.eventCard.flexShrink },
	requestImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
	newDot: { position: 'absolute', top: spacing[8], right: spacing[8], width: spacing[8], height: spacing[8], borderRadius: radius.full, backgroundColor: colors.action.secondary },
	requestActions: { flexDirection: 'row', gap: spacing[8], marginTop: 'auto', justifyContent: 'center', alignItems: 'center' },
	requestButton: { minWidth: layout.eventCard.requestButtonSize, width: layout.eventCard.requestButtonSize, paddingHorizontal: layout.eventCard.requestButtonPaddingHorizontal, alignItems: 'center', justifyContent: 'center' },
});