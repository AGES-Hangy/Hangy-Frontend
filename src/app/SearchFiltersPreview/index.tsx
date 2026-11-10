import { useState } from 'react';

import { SearchScreenView } from '@/components/SearchScreenView';
import { PREVIEW_VIEW_PROPS } from '@/mocks/searchPreview';

/** Preview do frame `Busca — filtros` (2366-8708): FilterPanel sobreposto aos resultados. */
export default function SearchFiltersPreview() {
  const [visible, setVisible] = useState(true);
  return (
    <SearchScreenView
      {...PREVIEW_VIEW_PROPS}
      isFilterPanelVisible={visible}
      onOpenFilterPanel={() => setVisible(true)}
      onCloseFilterPanel={() => setVisible(false)}
      onApplyFilters={() => setVisible(false)}
    />
  );
}

