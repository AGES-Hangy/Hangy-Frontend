import { SearchScreenView } from '@/components/SearchScreenView';
import { PREVIEW_VIEW_PROPS } from '@/mocks/searchPreview';

/** Preview do frame `Busca — resultados` (2366-8684): os três blocos e o evento privado em preview. */
export default function SearchResultsPreview() {
  return <SearchScreenView {...PREVIEW_VIEW_PROPS} />;
}

