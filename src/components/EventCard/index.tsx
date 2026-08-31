import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
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

const privacyLabels: Record<EventPrivacy, string> = {
	Publico: 'Público',
	Privado: 'Privado',
	PorConvite: 'Por convite',
};

const placeholderImage = require('../../../assets/images/hangy.svg');

function getPrivacyBadgeValue(privacy: EventPrivacy) {
	if (privacy === 'Publico') return 'Público';
	if (privacy === 'Privado') return 'Privado';
	return 'Por convite';
}

function getStatusBadgeValue(state: EventCardProps['state']) {
	if (state === 'Confirmed') return 'Confirmado';
	if (state === 'Pending') return 'Pendente';
	return null;
}

export function EventCard({
	variant,
	event,
	privacy = 'Publico',
	state = 'Default',
	isNew = false,
	onPress,
}: EventCardProps) {
	const accessibleLabel = `${event.title}, ${formatEventDate(event.date)}, ${event.location}, ${privacyLabels[privacy]}`;
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
			transition={150}
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
						<MaterialIcons name="event" size={14} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
					</View>
					<Text style={styles.metaSeparator}>•</Text>
					<View style={styles.metaItem}>
						<MaterialIcons name="place" size={14} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
					</View>
				</View>
			) : (
				<>
					<View style={styles.detailLine}>
						<MaterialIcons name="event" size={14} color={colors.text.secondary} />
						<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
					</View>
					<View style={styles.detailLine}>
						<MaterialIcons name="place" size={14} color={colors.text.secondary} />
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
				{stateBadge ? <Badge family="Status" value={stateBadge} /> : <MaterialIcons name="chevron-right" size={24} color={colors.text.tertiary} style={styles.compactChevron} />}
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
					<MaterialIcons name="event" size={14} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
				</View>
				<View style={styles.detailLine}>
					<MaterialIcons name="place" size={14} color={colors.text.secondary} />
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
					<MaterialIcons name="person" size={14} color={colors.text.secondary} />
					<Text numberOfLines={1} style={styles.detailText}>{requesterName} solicitou</Text>
				</View>
				<View style={styles.detailLine}>
					<MaterialIcons name="event" size={14} color={colors.text.secondary} />
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
	pressed: { opacity: 0.82 },
	card: { overflow: 'visible', backgroundColor: colors.surface.card, borderRadius: radius.md, ...elevation[1] },
	featured: { width: 320, height: 288, borderRadius: radius.lg },
	featuredImageWrap: { height: 160, overflow: 'hidden', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
	featuredImage: { width: '100%', height: '100%', backgroundColor: colors.surface.sunken },
	privacyTagWrap: { position: 'absolute', top: spacing[12], left: spacing[12], zIndex: 1 },
	details: { flex: 1, gap: spacing[4], padding: spacing[12] },
	title: { ...typography.h4, color: colors.text.primary },
	compactTitle: { ...typography.labelM, color: colors.text.primary },
	detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
	compactMetaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexWrap: 'wrap' },
	metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexShrink: 1 },
	metaSeparator: { color: colors.text.tertiary },
	detailText: { ...typography.caption, color: colors.text.secondary, flexShrink: 1 },
	compact: { width: '100%', maxWidth: 520, height: 88, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, overflow: 'visible' },
	compactImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
	compactImage: { width: 88, height: 88, backgroundColor: colors.surface.sunken },
	compactContent: { flex: 1, justifyContent: 'center', paddingVertical: spacing[8], paddingRight: spacing[8] },
	compactMeta: { marginTop: spacing[4], alignSelf: 'flex-start', position: 'relative', top: -10, left: 5, right: 0 },
	compactStateWrap: { alignItems: 'center', justifyContent: 'center', paddingRight: spacing[12], minWidth: 92 },
	compactChevron: { marginRight: spacing[12] },
	mapPreview: { width: 280, height: 96, flexDirection: 'row', alignItems: 'center', padding: spacing[8], overflow: 'visible' },
	mapImageWrap: { position: 'relative', overflow: 'hidden', borderRadius: radius.eventCardSm },
	mapImage: { width: 80, height: 80, borderRadius: radius.eventCardSm, backgroundColor: colors.surface.sunken },
	mapDetails: { position: 'relative', flex: 1, gap: spacing[4], paddingHorizontal: spacing[8], paddingTop: spacing[8] },
	mapBadgeAbove: { marginTop: spacing[4], alignSelf: 'flex-start' },
	mini: { width: 172, height: 226, overflow: 'visible' },
	miniImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
	miniImage: { width: '100%', height: 112, backgroundColor: colors.surface.sunken },
	miniBadgeOverlay: { position: 'absolute', top: spacing[8], left: spacing[8], zIndex: 1 },
	requestImage: { width: '100%', height: 96, backgroundColor: colors.surface.sunken },
	miniContent: { flex: 1, gap: spacing[4], padding: spacing[8] },
	miniTitle: { ...typography.labelM, color: colors.text.primary, flexShrink: 1 },
	requestImageWrap: { position: 'relative', overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
	newDot: { position: 'absolute', top: spacing[8], right: spacing[8], width: spacing[8], height: spacing[8], borderRadius: radius.full, backgroundColor: colors.action.secondary },
	requestActions: { flexDirection: 'row', gap: spacing[8], marginTop: 'auto', justifyContent: 'center', alignItems: 'center' },
	requestButton: { minWidth: 40, width: 40, paddingHorizontal: 0, alignItems: 'center', justifyContent: 'center' },
});