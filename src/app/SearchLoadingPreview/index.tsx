import { SearchScreenView } from '@/components/SearchScreenView';
import { PREVIEW_VIEW_PROPS } from '@/mocks/searchPreview';

/** Preview do frame `Busca — carregando` (2366-8769): Skeleton com a métrica dos componentes reais. */
export default function SearchLoadingPreview() {
  return <SearchScreenView {...PREVIEW_VIEW_PROPS} results={null} isLoading />;
}

