import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import type { Event } from '@/components/EventCard/types';
import { FilterPanel } from '@/components/FilterPanel';
import { ListItem } from '@/components/ListItem';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSearch } from '@/hooks/useSearch';
import { useTags } from '@/hooks/useTags';
import type { SearchBusinessItem, SearchEventItem, SearchUserItem } from '@/types/search';
import {
  buildTagNameMap,
  formatAppliedDateLabel,
  hasActiveAppliedFilters,
} from '@/utils/searchFilters';

const SKELETON_SECTIONS = ['EVENTOS', 'ESTABELECIMENTOS', 'PESSOAS'] as const;
const SKELETON_ITEMS_PER_SECTION = 2;

const OFFLINE_BANNER_OFFSET = spacing[64];

function toSearchEvent(item: SearchEventItem): Event {
  return {
    id: item.event_id,
    title: item.title,
    date: item.event_date,
    location: item.location_name,
    imageUrl: item.cover_photo_url ?? '',
    privacy: item.privacy,
    isPreview: item.is_preview,
    description: item.is_preview ? null : item.description,
    participantsCount: item.is_preview ? null : item.participants_count,
  };
}

function businessDisplayName(item: SearchBusinessItem): string {
  return item.business_name?.trim() || item.name?.trim() || 'Estabelecimento';
}

function businessSubtitle(item: SearchBusinessItem): string | undefined {
  const description = item.description?.trim();
  const address = item.address?.trim();
  if (description && address && !description.includes(address)) {
    return `${description} · ${address}`;
  }
  return description || address || undefined;
}

function userDisplayName(item: SearchUserItem): string {
  return item.name?.trim() || 'Usuário';
}

function userSubtitle(item: SearchUserItem): string | undefined {
  const description = item.description?.trim();
  const location = [item.city?.trim(), item.state?.trim()].filter(Boolean).join(', ');
  if (description && location && !description.includes(location)) {
    return `${description} · ${location}`;
  }
  return description || location || undefined;
}

function SearchSkeleton() {
  return (
    <ScrollView
      style={styles.resultsScroll}
      contentContainerStyle={styles.resultsContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando resultados da busca"
    >
      {SKELETON_SECTIONS.map((sectionTitle) => (
        <View key={sectionTitle} style={styles.section}>
          <SectionHeader title={sectionTitle} variant="overline" />
          <View style={styles.sectionItems}>
            {Array.from({ length: SKELETON_ITEMS_PER_SECTION }, (_, index) => (
              <Skeleton key={index} type="Item" />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export default function Search() {
  const { isOffline } = useNetworkStatus();
  const { tags, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } = useTags();
  const {
    query,
    setQuery,
    submitSearch,
    results,
    appliedFilters,
    filterValue,
    isLoading,
    error,
    applyFilters,
    removeTagFilter,
    removeDateFilter,
    clearFilters,
    retry,
  } = useSearch();

  const [isFilterPanelVisible, setIsFilterPanelVisible] = useState(false);

  const tagNameMap = useMemo(() => buildTagNameMap(tags), [tags]);
  const hasFilters = hasActiveAppliedFilters(appliedFilters);
  const dateLabel = useMemo(() => formatAppliedDateLabel(appliedFilters), [appliedFilters]);

  const eventsBlock = results?.events;
  const businessesBlock = results?.businesses;
  const usersBlock = results?.users;

  const hasAnyResults =
    Boolean(eventsBlock && eventsBlock.items.length > 0) ||
    Boolean(businessesBlock && businessesBlock.items.length > 0) ||
    Boolean(usersBlock && usersBlock.items.length > 0);

  const activeQuery = results?.query ?? query.trim();

  return (
    <View style={styles.screen}>
      <View style={[styles.topArea, isOffline && styles.topAreaOffline]}>
        <TextField
          type="Search"
          placeholder="Buscar eventos, estabelecimentos ou pessoas"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          trailingIcon="sliders-horizontal"
          onTrailingIconPress={() => setIsFilterPanelVisible(true)}
          onTrailingIconPressAccessibilityLabel={
            hasFilters ? 'Filtros ativos, abrir filtros' : 'Abrir filtros'
          }
          accessibilityLabel="Buscar eventos, estabelecimentos ou pessoas"
        />

        {hasFilters && !isLoading && (
          <View style={styles.appliedFiltersRow} accessibilityLabel="Filtros ativos">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.appliedFilterChips}
              keyboardShouldPersistTaps="handled"
            >
              {dateLabel && (
                <Chip
                  label={dateLabel}
                  categoryType="macro"
                  size="md"
                  isSelected
                  showRemoveIcon
                  onPress={removeDateFilter}
                  onRemove={removeDateFilter}
                  accessibilityLabel={`Remover filtro de data ${dateLabel}`}
                />
              )}

              {appliedFilters.tag_ids.map((tagId) => {
                const label = tagNameMap.get(tagId);
                if (!label) return null;
                return (
                  <Chip
                    key={tagId}
                    label={label}
                    categoryType="macro"
                    size="md"
                    isSelected
                    showRemoveIcon
                    onPress={() => removeTagFilter(tagId)}
                    onRemove={() => removeTagFilter(tagId)}
                    accessibilityLabel={`Remover filtro ${label}`}
                  />
                );
              })}
            </ScrollView>

            <Button
              label="Limpar"
              variant="Tertiary"
              size="SM"
              onPress={clearFilters}
              accessibilityLabel="Limpar filtros"
              style={styles.clearFiltersButton}
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <SearchSkeleton />
      ) : error ? (
        <EmptyState
          context="Search"
          icon="circle-alert"
          title={error.title}
          text={error.message}
          cta
          ctaLabel="Tentar de novo"
          onCtaPress={retry}
          fill
        />
      ) : results !== null && !hasAnyResults ? (
        <EmptyState
          context="Search"
          title={activeQuery ? `Nada encontrado para "${activeQuery}"` : 'Nenhum resultado com esses filtros'}
          text={
            activeQuery
              ? 'A busca cobre eventos, estabelecimentos e pessoas. Tente outra palavra ou revise os filtros.'
              : 'Tente outras datas ou tags, ou limpe os filtros.'
          }
          cta={hasFilters}
          ctaLabel={hasFilters ? 'Limpar filtros' : undefined}
          onCtaPress={hasFilters ? clearFilters : undefined}
          fill
        />
      ) : results !== null && hasAnyResults ? (
        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {eventsBlock && eventsBlock.items.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={`EVENTOS · ${eventsBlock.total}`}
                variant="overline"
                action={eventsBlock.has_more}
                actionLabel="Ver todos"
                showActionIcon={false}
                actionAccessibilityLabel="Ver todos os eventos"
              />
              <View style={styles.sectionItems}>
                {eventsBlock.items.map((item) => (
                  <EventCard
                    key={item.event_id}
                    variant="Compact"
                    isPreview={item.is_preview}
                    event={toSearchEvent(item)}
                    onPress={() => router.push({ pathname: '/EventDetail', params: { id: item.event_id } })}
                  />
                ))}
              </View>
            </View>
          )}

          {businessesBlock && businessesBlock.items.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={`ESTABELECIMENTOS · ${businessesBlock.total}`}
                variant="overline"
                action={businessesBlock.has_more}
                actionLabel="Ver todos"
                showActionIcon={false}
                actionAccessibilityLabel="Ver todos os estabelecimentos"
              />
              <View style={styles.sectionItems}>
                {businessesBlock.items.map((item) => (
                  <ListItem
                    key={item.user_id}
                    type="Business"
                    name={businessDisplayName(item)}
                    subtitle={businessSubtitle(item)}
                    avatarUri={item.photo_url ?? undefined}
                    onPress={() => router.push({ pathname: '/UserProfile', params: { id: item.user_id } })}
                  />
                ))}
              </View>
            </View>
          )}

          {usersBlock && usersBlock.items.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title={`PESSOAS · ${usersBlock.total}`}
                variant="overline"
                action={usersBlock.has_more}
                actionLabel="Ver todas"
                showActionIcon={false}
                actionAccessibilityLabel="Ver todas as pessoas"
              />
              <View style={styles.sectionItems}>
                {usersBlock.items.map((item) => (
                  <ListItem
                    key={item.user_id}
                    type="Person"
                    name={userDisplayName(item)}
                    subtitle={userSubtitle(item)}
                    avatarUri={item.photo_url ?? undefined}
                    onPress={() => router.push({ pathname: '/UserProfile', params: { id: item.user_id } })}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : null}

      <FilterPanel
        visible={isFilterPanelVisible}
        variant="Search"
        value={filterValue}
        onApply={(next) => {
          setIsFilterPanelVisible(false);
          applyFilters(next);
        }}
        onClose={() => setIsFilterPanelVisible(false)}
        tags={tags}
        tagsLoading={tagsLoading}
        tagsError={tagsError}
        onRetryTags={() => void refetchTags()}
      />

      {isOffline && <OfflineBanner />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  topArea: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
    gap: spacing[12],
  },
  topAreaOffline: {
    paddingTop: OFFLINE_BANNER_OFFSET,
  },
  appliedFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  appliedFilterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  clearFiltersButton: {
    paddingHorizontal: spacing[8],
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[24],
    gap: spacing[16],
  },
  section: {
    gap: spacing[4],
  },
  sectionItems: {
    gap: spacing[8],
  },
});
