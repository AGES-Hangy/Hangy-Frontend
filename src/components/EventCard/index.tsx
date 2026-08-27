import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

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

const privacyLabels: Record<EventPrivacy, string> = {
	Publico: 'Público',
	Privado: 'Privado',
	PorConvite: 'Por convite',
};

const placeholderImage = require('../../../assets/images/hangy.svg');

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

function PrivacyBadge({ privacy }: { privacy: EventPrivacy }) {
	return (
		<View style={styles.privacyBadge}>
			<MaterialIcons name={privacy === 'Publico' ? 'public' : 'lock'} size={14} color={colors.text.inverse} />
			<Text style={styles.privacyText}>{privacyLabels[privacy]}</Text>
		</View>
	);
}

function EventDetails({ event, compact = false }: { event: Event; compact?: boolean }) {
	return (
		<View style={styles.details}>
			<Text numberOfLines={compact ? 1 : 2} style={compact ? styles.compactTitle : styles.title}>{event.title}</Text>
			<View style={styles.detailLine}>
				<MaterialIcons name="event" size={14} color={colors.text.secondary} />
				<Text numberOfLines={1} style={styles.detailText}>{event.date}</Text>
			</View>
			<View style={styles.detailLine}>
				<MaterialIcons name="place" size={14} color={colors.text.secondary} />
				<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
			</View>
		</View>
	);
}

function FeaturedCard({ event }: { event: Event }) {
	return <View style={[styles.card, styles.featured]}><View style={styles.featuredImageWrap}><EventImage event={event} style={styles.featuredImage} /><PrivacyBadge privacy={event.privacy} /></View><EventDetails event={event} /></View>;
}

function CompactCard({ event, state }: { event: Event; state: EventCardProps['state'] }) {
	const stateLabel = state === 'Confirmed' ? 'Confirmado' : state === 'Pending' ? 'Pendente' : '';
	return <View style={[styles.card, styles.compact]}><EventImage event={event} style={styles.compactImage} /><EventDetails event={event} compact />{stateLabel ? <Text style={state === 'Confirmed' ? styles.confirmed : styles.pending}>{stateLabel}</Text> : null}</View>;
}

function MapPreviewCard({ event }: { event: Event }) {
	const distance = event.distance ?? '250 m';

	return <View style={[styles.card, styles.mapPreview]}><EventImage event={event} style={styles.mapImage} /><View style={styles.mapDetails}><Text numberOfLines={1} style={styles.compactTitle}>{event.title}</Text><View style={styles.detailLine}><MaterialIcons name="near-me" size={14} color={colors.text.secondary} /><Text numberOfLines={1} style={styles.detailText}>{distance}</Text></View></View></View>;
}

function MiniCard({ event }: { event: Event }) {
	return <View style={[styles.card, styles.mini]}><EventImage event={event} style={styles.miniImage} /><View style={styles.miniContent}><Text numberOfLines={2} style={styles.miniTitle}>{event.title}</Text><Text numberOfLines={1} style={styles.detailText}>{event.date}</Text></View></View>;
}

function RequestCard({ event, isNew }: { event: Event; isNew: boolean }) {
	return <View style={[styles.card, styles.mini]}><View style={styles.requestImageWrap}><EventImage event={event} style={styles.miniImage} />{isNew ? <View style={styles.newDot} /> : null}</View><View style={styles.miniContent}><Text numberOfLines={2} style={styles.miniTitle}>{event.title}</Text><Text numberOfLines={1} style={styles.detailText}>{event.location}</Text><Text style={styles.requestLabel}>Solicitação</Text></View></View>;
}

const styles = StyleSheet.create({
	pressable: { alignSelf: 'flex-start' },
	pressed: { opacity: 0.82 },
	card: { overflow: 'hidden', backgroundColor: colors.surface.card, borderRadius: radius.md, ...elevation[1] },
	featured: { width: 320, height: 288, borderRadius: radius.lg },
	featuredImageWrap: { height: 160 },
	featuredImage: { width: '100%', height: '100%', backgroundColor: colors.surface.sunken },
	privacyBadge: { position: 'absolute', top: spacing[12], left: spacing[12], flexDirection: 'row', alignItems: 'center', gap: spacing[4], paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: radius.full, backgroundColor: colors.action.primary },
	privacyText: { ...typography.labelS, color: colors.text.inverse },
	details: { flex: 1, gap: spacing[4], padding: spacing[12] },
	title: { ...typography.h4, color: colors.text.primary },
	compactTitle: { ...typography.labelM, color: colors.text.primary },
	detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
	detailText: { ...typography.caption, color: colors.text.secondary, flexShrink: 1 },
	compact: { width: '100%', maxWidth: 520, height: 88, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md },
	compactImage: { width: 88, height: 88, backgroundColor: colors.surface.sunken },
	confirmed: { ...typography.labelS, color: colors.feedback.success, paddingRight: spacing[12] },
	pending: { ...typography.labelS, color: colors.action.secondary, paddingRight: spacing[12] },
	mapPreview: { width: 280, height: 96, flexDirection: 'row', alignItems: 'center', padding: spacing[8] },
	mapImage: { width: 80, height: 80, borderRadius: radius.eventCardSm, backgroundColor: colors.surface.sunken },
	mapDetails: { flex: 1, gap: spacing[4], paddingHorizontal: spacing[8] },
	mini: { width: 172, height: 226 },
	miniImage: { width: '100%', height: 112, backgroundColor: colors.surface.sunken },
	miniContent: { flex: 1, gap: spacing[4], padding: spacing[8] },
	miniTitle: { ...typography.labelM, color: colors.text.primary, flexShrink: 1 },
	requestImageWrap: { position: 'relative' },
	newDot: { position: 'absolute', top: spacing[8], right: spacing[8], width: spacing[8], height: spacing[8], borderRadius: radius.full, backgroundColor: colors.action.secondary },
	requestLabel: { ...typography.caption, color: colors.text.brand },
});
