import type { TagLeaf, TagNode } from '@/hooks/useTags';

/**
 * Onde o painel é usado. Muda quais blocos aparecem:
 *
 * - `Search`: a busca mistura eventos, pessoas e estabelecimentos, então o
 *   painel ganha o bloco "Mostrar" (tipo de resultado) e o de distância, e
 *   avisa quais blocos só valem para parte dos resultados.
 * - `Live`: a tela Ao vivo só lista eventos e o mapa já limita a distância,
 *   então ficam só data e tags, sem os avisos de "só afeta eventos".
 */
export type FilterPanelVariant = 'Search' | 'Live';

/** Atalhos do bloco "Data do evento". `custom` é o "Escolher data" (intervalo). */
export type DatePreset = 'today' | 'tomorrow' | 'weekend' | 'custom';

/** Bloco "Mostrar" da variante `Search`. Sem valor = todos os tipos. */
export type ResultType = 'events' | 'people' | 'businesses';

/** Raios do bloco "Distância", em km. O backend aceita até 50 km (`radius_m`). */
export type DistanceKm = 1 | 5 | 10 | 25;

export type FilterValue = {
  /**
   * Qual chip de data está marcado. Guardado junto do intervalo para a tela
   * poder recalcular "Hoje" num dia seguinte, em vez de buscar a data velha.
   */
  datePreset?: DatePreset;
  /** Início do intervalo, `YYYY-MM-DD` no fuso do aparelho. Só afeta eventos. */
  dateFrom?: string;
  /** Fim do intervalo (inclusivo), `YYYY-MM-DD`. Só afeta eventos. */
  dateTo?: string;
  /** Tags macro e micro marcadas, juntas. Valem para todos os resultados. */
  tagIds: string[];
  /** Só na variante `Search`. */
  resultType?: ResultType;
  /** Só na variante `Search`. Afeta eventos e estabelecimentos. */
  maxDistanceKm?: DistanceKm;
};

export type FilterPanelProps = {
  /** Abre/fecha. Ao abrir, o rascunho volta a ser o `value`. */
  visible?: boolean;
  variant?: FilterPanelVariant;
  /** Filtros ativos. */
  value: FilterValue;
  /** "Aplicar filtros": recebe o rascunho já normalizado e fecha o painel. */
  onApply: (value: FilterValue) => void;
  /**
   * "Limpar": avisa que o rascunho foi zerado. O painel continua aberto e o
   * filtro ativo só muda no `onApply` — não dispare a busca daqui.
   */
  onClear?: () => void;
  /** Fecha sem aplicar (×, toque fora ou voltar do Android). */
  onClose: () => void;

  /** Árvore de tags (`useTags`). */
  tags: TagNode[];
  /**
   * Micro mostradas enquanto nenhuma macro está marcada — os interesses do
   * usuário. Sem isto, o bloco micro pede para escolher uma macro primeiro.
   */
  suggestedMicroTags?: TagLeaf[];
  tagsLoading?: boolean;
  tagsError?: string | null;
  onRetryTags?: () => void;
};
