import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AvatarGroup } from '@/components/AvatarGroup';
import { Badge, getPrivacyBadgeLabel, getPrivacyBadgeValue, getStatusBadgeValue } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { colors, palette } from '@/constants/colors';
import { elevation, layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { Event, EventCardProps, EventPrivacy } from './types';

/** `30/10/2026` — data curta usada por todas as variantes (Figma não escreve o mês por extenso). */
function formatShortDate(value: string) {
	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(parsedDate);
}

/** `16:00` */
function formatShortTime(value: string) {
	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return '';
	}

	return new Intl.DateTimeFormat('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(parsedDate);
}

const placeholderImage = require('../../../assets/images/hangy.svg');

export function EventCard({
	variant,
	event,
	state = 'Default',
	isNew = false,
	onPress,
	onNotifyPress,
}: EventCardProps) {
	const accessibleLabel = `${event.title}, ${formatShortDate(event.date)} às ${formatShortTime(event.date)}, ${event.location}, ${getPrivacyBadgeLabel(event.privacy)}`;

	return (
		<Pressable
			accessibilityLabel={accessibleLabel}
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.pressable,
				// `Compact` é a única variante com largura fluida (width: '100%' até
				// compactMaxWidth); as outras têm largura fixa e devem encolher ao
				// conteúdo. Sem isto, `width: '100%'` do card não tem uma largura de
				// referência (o Pressable encolhe ao próprio conteúdo) e o card
				// estoura para a direita da tela.
				variant === 'Compact' && styles.pressableFluid,
				pressed && styles.pressed,
			]}
		>
			{variant === 'Featured' && <FeaturedCard event={event} onNotifyPress={onNotifyPress} />}
			{variant === 'Compact' && <CompactCard event={event} state={state} />}
			{variant === 'MapPreview' && <MapPreviewCard event={event} />}
			{variant === 'Mini' && <MiniCard event={event} onNotifyPress={onNotifyPress} />}
			{variant === 'Request' && <RequestCard event={event} isNew={isNew} />}
		</Pressable>
	);
}

function EventImage({ event, style, placeholderColor }: { event: Event; style: object; placeholderColor: string }) {
	const [hasImageError, setHasImageError] = useState(false);

	return (
		<View style={[style, { backgroundColor: placeholderColor }]}>
			<Image
				accessibilityLabel={`Capa do evento ${event.title}`}
				source={hasImageError ? placeholderImage : event.imageUrl}
				placeholder={placeholderImage}
				onError={() => setHasImageError(true)}
				contentFit="cover"
				transition={layout.eventCard.imageTransitionDuration}
				style={StyleSheet.absoluteFill}
			/>
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

/** Sino de notificações sobre a capa — mesmo `IconButton` de sempre, só posicionado por cima da imagem. */
function NotifyButton({ style, onPress }: { style: object; onPress?: () => void }) {
	return (
		<IconButton
			icon="bell"
			size="SM"
			variant="Outline"
			accessibilityLabel="Ativar notificações do evento"
			onPress={onPress}
			style={style}
		/>
	);
}

function TagRow({ tags }: { tags: string[] }) {
	if (tags.length === 0) return null;

	return (
		<View style={styles.tagRow}>
			{tags.map((tag, index) => (
				<Chip key={tag} label={tag} categoryType={index === 0 ? 'macro' : 'micro'} size="sm" isSelected />
			))}
		</View>
	);
}

function AttendeesGroup({ attendees }: { attendees: Event['attendeeAvatars'] }) {
	if (!attendees || attendees.length === 0) return null;

	return (
		<AvatarGroup
			avatars={attendees.map((source) => ({ source: source ?? undefined }))}
			accessibilityLabel="Pessoas confirmadas"
			size={layout.eventCard.footerAvatarSize}
			overlap={layout.eventCard.footerAvatarOverlap}
		/>
	);
}

function FeaturedCard({ event, onNotifyPress }: { event: Event; onNotifyPress?: () => void }) {
	const tags = event.tags ?? [];
	const hasFooter = tags.length > 0 || (event.attendeeAvatars?.length ?? 0) > 0;

	return (
		<View style={[styles.cardFlat, styles.featured]}>
			<View style={styles.featuredImageWrap}>
				<EventImage event={event} style={styles.featuredImage} placeholderColor={palette.primary[200]} />
				<PrivacyTag privacy={event.privacy} />
				<NotifyButton style={styles.featuredNotifyPosition} onPress={onNotifyPress} />
			</View>

			{/* 1 linha: `Featured` tem altura fixa (288) — um título de 2 linhas
			    empurrava o conteúdo pra fora da borda e cortava os chips do rodapé. */}
			<Text numberOfLines={1} style={styles.title}>{event.title}</Text>

			<View style={styles.detailLine}>
				<Icon name="calendar" size={layout.eventCard.detailIconSize} color={colors.text.secondary} absoluteStrokeWidth />
				<Text numberOfLines={1} style={styles.detailText}>
					{formatShortDate(event.date)} · {formatShortTime(event.date)}
				</Text>
			</View>
			<View style={styles.detailLine}>
				<Icon name="map-pin" size={layout.eventCard.detailIconSize} color={colors.text.secondary} absoluteStrokeWidth />
				<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
			</View>

			{hasFooter && (
				<View style={styles.featuredFooter}>
					<TagRow tags={tags} />
					<AttendeesGroup attendees={event.attendeeAvatars} />
				</View>
			)}
		</View>
	);
}

function CompactCard({ event, state }: { event: Event; state: EventCardProps['state'] }) {
	const stateBadge = getStatusBadgeValue(state);
	// Figma: uma única linha "data · horário · local", sem ícone — não são três
	// blocos separados, é um texto só que trunca com reticências se não couber.
	const meta = `${formatShortDate(event.date)} · ${formatShortTime(event.date)} · ${event.location}`;

	return (
		<View style={[styles.cardFlat, styles.compact]}>
			<View style={styles.compactImageWrap}>
				<EventImage event={event} style={styles.compactImage} placeholderColor={palette.primary[200]} />
			</View>

			<View style={styles.compactContent}>
				<Text numberOfLines={1} style={styles.compactTitle}>{event.title}</Text>
				<Text numberOfLines={1} style={styles.detailText}>{meta}</Text>
				<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
			</View>

			{stateBadge ? (
				<Badge family="Status" value={stateBadge} />
			) : (
				<Icon
					name="chevron-right"
					size={layout.eventCard.chevronSize}
					color={colors.text.tertiary}
					absoluteStrokeWidth
				/>
			)}
		</View>
	);
}

function MapPreviewCard({ event }: { event: Event }) {
	const distance = event.distance ?? '250 metros';

	return (
		<View style={[styles.cardFlat, styles.mapPreview]}>
			<View style={styles.mapImageWrap}>
				<EventImage event={event} style={styles.mapImage} placeholderColor={palette.secondary[200]} />
			</View>
			<View style={styles.mapDetails}>
				<Text numberOfLines={1} style={styles.compactTitle}>{event.title}</Text>
				<Text numberOfLines={1} style={[styles.detailText, styles.mapPreviewDistance]}>
					a {distance} de você
				</Text>
				<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
			</View>
		</View>
	);
}

function MiniCard({ event, onNotifyPress }: { event: Event; onNotifyPress?: () => void }) {
	const tag = event.tags?.[0];

	return (
		<View style={[styles.cardElevated, styles.carousel]}>
			<View style={styles.miniImageWrap}>
				<EventImage event={event} style={styles.miniImage} placeholderColor={palette.primary[200]} />
				<View style={styles.overlayBadge}>
					<Badge family="Privacy" value={getPrivacyBadgeValue(event.privacy)} />
				</View>
				<NotifyButton style={styles.miniNotifyPosition} onPress={onNotifyPress} />
			</View>

			<View style={styles.carouselContent}>
				<Text numberOfLines={1} style={styles.miniTitle}>{event.title}</Text>
				<View style={styles.detailLine}>
					<Icon name="calendar" size={layout.eventCard.detailIconSize} color={colors.text.secondary} absoluteStrokeWidth />
					<Text numberOfLines={1} style={styles.detailText}>
						{formatShortDate(event.date)} · {formatShortTime(event.date)}
					</Text>
				</View>
				<View style={styles.detailLine}>
					<Icon name="map-pin" size={layout.eventCard.detailIconSize} color={colors.text.secondary} absoluteStrokeWidth />
					<Text numberOfLines={1} style={styles.detailText}>{event.location}</Text>
				</View>

				{(tag || (event.attendeeAvatars?.length ?? 0) > 0) && (
					<View style={styles.miniFooter}>
						{tag ? <Chip label={tag} categoryType="macro" size="sm" isSelected /> : <View />}
						<AttendeesGroup attendees={event.attendeeAvatars} />
					</View>
				)}
			</View>
		</View>
	);
}

function RequestCard({ event, isNew }: { event: Event; isNew: boolean }) {
	const requesterName = event.requesterName ?? 'Usuário';

	return (
		<View style={[styles.cardElevated, styles.carousel]}>
			<View style={styles.requestImageWrap}>
				<EventImage event={event} style={styles.requestImage} placeholderColor={palette.primary[200]} />
				{isNew && (
					<View style={styles.newBadge}>
						<Text style={styles.newBadgeLabel}>Nova</Text>
					</View>
				)}
			</View>

			<View style={styles.carouselContent}>
				{/* 1 linha: mesma razão do `Featured` — carrossel de altura consistente. */}
				<Text numberOfLines={1} style={styles.miniTitle}>{event.title}</Text>

				<View style={styles.detailLine}>
					<Icon name="user" size={layout.eventCard.detailIconSize} color={colors.text.tertiary} absoluteStrokeWidth />
					<Text numberOfLines={1} style={[styles.detailText, styles.requestDetailText]}>
						{requesterName} solicitou
					</Text>
				</View>
				<View style={styles.detailLine}>
					<Icon name="calendar" size={layout.eventCard.detailIconSize} color={colors.text.tertiary} absoluteStrokeWidth />
					<Text numberOfLines={1} style={[styles.detailText, styles.requestDetailText]}>
						{formatShortDate(event.date)} · {formatShortTime(event.date)}
					</Text>
				</View>

				<View style={styles.requestActions}>
					<Pressable
						onPress={() => undefined}
						accessibilityRole="button"
						accessibilityLabel="Aceitar solicitação"
						style={styles.acceptButton}
					>
						<Icon name="check" size={18} color={colors.text.inverse} absoluteStrokeWidth />
					</Pressable>
					<Pressable
						onPress={() => undefined}
						accessibilityRole="button"
						accessibilityLabel="Recusar solicitação"
						style={styles.rejectButton}
					>
						<Icon name="x" size={16} color={colors.text.secondary} absoluteStrokeWidth />
					</Pressable>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pressable: { alignSelf: 'flex-start' },
	pressableFluid: { alignSelf: 'stretch', width: '100%' },
	pressed: { opacity: layout.eventCard.pressedOpacity },

	// `Featured`, `Compact` e `MapPreview` não têm sombra no Figma.
	cardFlat: { backgroundColor: colors.bg.base, borderWidth: 1, borderColor: colors.border.default },
	// `Mini` e `Request` (cards de carrossel) têm elevação 1.
	cardElevated: { backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.default, ...elevation[1] },

	title: { ...typography.h4, color: colors.text.primary },
	// `alignSelf: 'stretch'` nos três estilos de texto abaixo: os containers pai
	// usam `alignItems: 'flex-start'` (pra Badge/Chip não esticarem pro tamanho
	// do card), mas sem largura o `numberOfLines` do Text não tem contra o que
	// truncar — o texto simplesmente vaza. Isto dá a largura de volta só ao
	// texto, sem afetar os irmãos que precisam ficar do tamanho do conteúdo.
	compactTitle: { ...typography.labelL, color: colors.text.primary, alignSelf: 'stretch' },
	miniTitle: { ...typography.labelM, color: colors.text.primary, flexShrink: layout.eventCard.flexShrink, alignSelf: 'stretch' },
	detailLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], width: '100%' },
	// `flex: 1` faz efeito dentro de `detailLine` (linha, sobra da largura depois
	// do ícone); `alignSelf: 'stretch'` faz efeito dentro de `compactContent` /
	// `mapDetails` (coluna, onde o texto é filho direto, sem `detailLine`). Os
	// dois convivem sem conflito: cada um só atua no eixo que o outro ignora.
	detailText: {
		...typography.bodyS,
		color: colors.text.secondary,
		flex: 1,
		flexShrink: layout.eventCard.flexShrink,
		alignSelf: 'stretch',
	},
	requestDetailText: { color: colors.text.tertiary },
	mapPreviewDistance: { color: palette.primary[600] },

	tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], flexShrink: 1 },

	// Featured — w320 h288 r20, sem sombra.
	// `minHeight`, não `height`: a soma real de imagem + título (1 linha) + 2
	// linhas de detalhe + rodapé + os 4 gaps passa perto do limite de 288 — com
	// `height` fixo, o Text do título era espremido pelo flexbox em vez de o
	// card crescer, e ficava um fiapo de texto cortado.
	featured: {
		width: layout.eventCard.featuredWidth,
		minHeight: layout.eventCard.featuredHeight,
		borderRadius: radius.lg,
		alignItems: 'stretch',
		gap: spacing[8],
		paddingTop: spacing[8],
		paddingHorizontal: spacing[8],
		paddingBottom: spacing[16],
		overflow: 'visible',
	},
	featuredImageWrap: {
		height: layout.eventCard.featuredImageHeight,
		borderRadius: radius.md,
		overflow: 'hidden',
		position: 'relative',
	},
	featuredImage: { width: '100%', height: '100%' },
	privacyTagWrap: { position: 'absolute', top: spacing[12], left: spacing[12], zIndex: layout.eventCard.overlayZIndex },
	featuredNotifyPosition: {
		position: 'absolute',
		top: spacing[12],
		right: spacing[12],
		zIndex: layout.eventCard.overlayZIndex,
	},
	featuredFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[8] },

	// Compact — w100%(máx 520) h88 r14, largura fluida, sem sombra.
	compact: {
		width: '100%',
		maxWidth: layout.eventCard.compactMaxWidth,
		height: layout.eventCard.compactHeight,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.md,
		padding: spacing[8],
		gap: spacing[12],
		overflow: 'hidden',
	},
	compactImageWrap: {
		width: layout.eventCard.compactImageSize,
		height: layout.eventCard.compactImageSize,
		borderRadius: radius.sm,
		overflow: 'hidden',
	},
	compactImage: { width: '100%', height: '100%' },
	compactContent: { flex: 1, gap: spacing[4], alignItems: 'flex-start' },

	// MapPreview — w280 h96 r14, flutuante sobre o mapa, sem sombra.
	mapPreview: {
		width: layout.eventCard.mapPreviewWidth,
		height: layout.eventCard.mapPreviewHeight,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: radius.md,
		padding: spacing[8],
		gap: spacing[12],
		overflow: 'hidden',
	},
	mapImageWrap: {
		width: layout.eventCard.mapImageSize,
		height: layout.eventCard.mapImageSize,
		borderRadius: radius.sm,
		overflow: 'hidden',
	},
	mapImage: { width: '100%', height: '100%' },
	mapDetails: { flex: 1, gap: spacing[4], alignItems: 'flex-start' },

	// Mini e Request — cards do carrossel: w172 fixa, altura hug, r14, elevação 1.
	carousel: {
		width: layout.eventCard.miniWidth,
		borderRadius: radius.md,
		overflow: 'hidden',
	},
	carouselContent: { padding: spacing[12], gap: spacing[8], alignItems: 'flex-start' },

	miniImageWrap: {
		width: '100%',
		height: layout.eventCard.miniImageHeight,
		position: 'relative',
	},
	miniImage: { width: '100%', height: '100%' },
	overlayBadge: { position: 'absolute', top: spacing[8], left: spacing[8], zIndex: layout.eventCard.overlayZIndex },
	miniNotifyPosition: {
		position: 'absolute',
		top: spacing[8],
		right: spacing[8],
		zIndex: layout.eventCard.overlayZIndex,
	},
	miniFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },

	requestImageWrap: {
		width: '100%',
		height: layout.eventCard.requestImageHeight,
		position: 'relative',
	},
	requestImage: { width: '100%', height: '100%' },
	newBadge: {
		position: 'absolute',
		top: spacing[8],
		left: spacing[8],
		backgroundColor: palette.secondary[500],
		paddingHorizontal: spacing[8],
		paddingVertical: spacing[4],
		borderRadius: radius.full,
		zIndex: layout.eventCard.overlayZIndex,
	},
	// Nunca texto branco sobre âmbar — o Figma trava em palette/neutral/900.
	newBadgeLabel: { ...typography.labelS, color: palette.neutral[900] },

	requestActions: { flexDirection: 'row', gap: spacing[8], width: '100%' },
	acceptButton: {
		flex: 1,
		height: layout.eventCard.requestActionHeight,
		borderRadius: radius.sm,
		backgroundColor: colors.action.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rejectButton: {
		width: layout.eventCard.requestRejectWidth,
		height: layout.eventCard.requestActionHeight,
		borderRadius: radius.sm,
		backgroundColor: colors.surface.card,
		borderWidth: 1.5,
		borderColor: colors.border.strong,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
