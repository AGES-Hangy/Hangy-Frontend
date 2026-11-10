import { useState } from 'react';

import { SearchScreenView } from '@/components/SearchScreenView';
import {
  PREVIEW_APPLIED_FILTERS,
  PREVIEW_NO_FILTERS,
  PREVIEW_RESULTS,
  PREVIEW_VIEW_PROPS,
} from '@/mocks/searchPreview';
import { fromAppliedFilters } from '@/utils/searchFilters';

/** Preview do frame `Busca — filtros aplicados` (2366-8734): barra de filtros ativos; os Chips e o Limpar funcionam. */
export default function SearchAppliedFiltersPreview() {
  const [applied, setApplied] = useState(PREVIEW_APPLIED_FILTERS);
  return (
    <SearchScreenView
      {...PREVIEW_VIEW_PROPS}
      results={{ ...PREVIEW_RESULTS, applied_filters: applied }}
      appliedFilters={applied}
      filterValue={fromAppliedFilters(applied)}
      onRemoveTag={(tagId) => setApplied({ ...applied, tag_ids: applied.tag_ids.filter((id) => id !== tagId) })}
      onRemoveDate={() => setApplied({ ...applied, date_from: null, date_to: null })}
      onClearFilters={() => setApplied(PREVIEW_NO_FILTERS)}
    />
  );
}

