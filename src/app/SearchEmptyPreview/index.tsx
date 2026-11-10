import { SearchScreenView } from '@/components/SearchScreenView';
import { PREVIEW_NO_FILTERS, PREVIEW_VIEW_PROPS } from '@/mocks/searchPreview';

/** Preview do frame `Busca — sem resultados` (2366-8762): EmptyState preservando o termo digitado. */
export default function SearchEmptyPreview() {
  return (
    <SearchScreenView
      {...PREVIEW_VIEW_PROPS}
      query="poker"
      results={{
        query: 'poker',
        applied_filters: PREVIEW_NO_FILTERS,
        events: { items: [], total: 0, has_more: false },
        businesses: { items: [], total: 0, has_more: false },
        users: { items: [], total: 0, has_more: false },
      }}
    />
  );
}

