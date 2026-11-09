import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { AdminReportQueueItem, AdminReportQueuePage } from '@/types/adminReport';
import { reportQueueTargetName } from '@/utils/adminReportQueue';
import type { ReportQueueTab } from '@/utils/adminReportQueue';
import { describeAdminLoadError, endsAdminSession } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';

const PAGE_LIMIT = 20;
/** Maior `limit` aceito pelo backend. */
const MAX_PAGE_LIMIT = 100;
/** Espera depois da última tecla antes de buscar. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * - `initial`: outra lista (aba ou alvo): limpa e mostra o skeleton.
 * - `search`: mesma aba, outro termo: a lista anterior fica até a resposta.
 * - `refresh`: mesma lista, atualizada sem indicador.
 * - `more`: próxima página.
 */
type FetchMode = 'initial' | 'search' | 'refresh' | 'more';

type QueueFilters = {
  status: ReportQueueTab;
  search: string;
  targetUserId: string | null;
  targetEventId: string | null;
};

/** Uma denúncia nova desloca as páginas seguintes e repetiria itens já na tela. */
function mergeById(current: AdminReportQueueItem[], received: AdminReportQueueItem[]) {
  const seen = new Set(current.map((item) => item.report_id));
  return [...current, ...received.filter((item) => !seen.has(item.report_id))];
}

/**
 * Fila de denúncias (`GET /admin/reports`), por aba, com busca e filtro por alvo.
 *
 * - Recarrega ao voltar o foco: o detalhe resolve a denúncia no lugar e a fila
 *   não fica sabendo. Mantém o tamanho já carregado para a rolagem não saltar.
 * - `error` só existe quando não há lista para mostrar. Com lista, a falha vira
 *   toast com "Tentar de novo" e a lista fica.
 * - `activeSearch` é o termo da lista na tela, não o que está sendo digitado.
 */
export function useAdminReports({
  status,
  searchText,
  targetUserId,
  targetEventId,
}: {
  status: ReportQueueTab;
  searchText: string;
  targetUserId: string | null;
  targetEventId: string | null;
}) {
  const { addToast } = useToast();
  const [items, setItems] = useState<AdminReportQueueItem[]>([]);
  const [activeSearch, setActiveSearch] = useState('');
  const [targetName, setTargetName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [hasMore, setHasMore] = useState(false);

  /** Filtros do último pedido que trocou a lista; o "carregar mais" continua deles. */
  const filtersRef = useRef<QueueFilters>({ status, search: '', targetUserId: null, targetEventId: null });
  const cursorRef = useRef<string | null>(null);
  /** Cópia síncrona de `items`, para juntar páginas e medir o refresh. */
  const itemsRef = useRef<AdminReportQueueItem[]>([]);
  /** A lista dos filtros atuais já chegou ao menos uma vez. */
  const hasListRef = useRef(false);
  const inFlight = useRef(false);
  // Cada pedido que troca a lista invalida os que ainda estavam em voo.
  const generation = useRef(0);
  // O `onEndReached` dispara a cada rolagem: depois de uma falha, só o "Tentar de novo" volta.
  const loadMorePaused = useRef(false);
  const hasFocused = useRef(false);

  const fetchPage = useCallback(
    async (filters: QueueFilters, mode: FetchMode) => {
      if (mode === 'more' && inFlight.current) return;
      inFlight.current = true;
      const replace = mode !== 'more';
      const current = replace ? ++generation.current : generation.current;
      const previousFilters = filtersRef.current;
      let sessionEnded = false;

      loadMorePaused.current = false;
      if (replace) filtersRef.current = filters;
      if (mode === 'initial') {
        if (
          previousFilters.targetUserId !== filters.targetUserId ||
          previousFilters.targetEventId !== filters.targetEventId
        ) {
          setTargetName(null);
        }
        hasListRef.current = false;
        itemsRef.current = [];
        setItems([]);
        setHasMore(false);
        setError(null);
        setIsLoading(true);
      } else if (mode === 'search') {
        setIsSearching(true);
      } else if (mode === 'more') {
        setIsLoadingMore(true);
      }

      const limit =
        mode === 'refresh' ? Math.min(Math.max(itemsRef.current.length, PAGE_LIMIT), MAX_PAGE_LIMIT) : PAGE_LIMIT;

      try {
        const page = await apiFetch<AdminReportQueuePage>(
          endpoints.adminReports({
            status: filters.status,
            search: filters.search || undefined,
            targetUserId: filters.targetUserId,
            targetEventId: filters.targetEventId,
            limit,
            cursor: mode === 'more' ? cursorRef.current : null,
          }),
        );
        if (current !== generation.current) return;

        const next = replace ? page.items : mergeById(itemsRef.current, page.items);

        itemsRef.current = next;
        cursorRef.current = page.next_cursor;
        hasListRef.current = true;
        setItems(next);
        setHasMore(page.next_cursor !== null);
        setActiveSearch(filters.search);
        if (filters.targetUserId || filters.targetEventId) {
          // Sem linha nesta aba, mantém o nome que outra aba já trouxe.
          const name = reportQueueTargetName(next, filters.targetEventId !== null);
          if (name) setTargetName(name);
        }
        setError(null);
      } catch (caught) {
        if (current !== generation.current) return;
        if (endsAdminSession(caught)) {
          sessionEnded = true;
          return;
        }

        const loadError = describeAdminLoadError(caught);
        if (!hasListRef.current) {
          setError(loadError);
          return;
        }
        // A lista anterior continua na tela: o cursor e os filtros seguem sendo dela.
        if (mode === 'search') filtersRef.current = previousFilters;
        if (mode === 'more') loadMorePaused.current = true;

        const retryGeneration = generation.current;
        addToast({
          type: 'error',
          message: loadError.message,
          actionLabel: 'Tentar de novo',
          onAction: () => {
            // Ignora o toast de uma lista que o usuário já trocou.
            if (generation.current === retryGeneration) void fetchPage(filters, mode);
          },
        });
      } finally {
        if (current === generation.current) {
          inFlight.current = false;
          // Com a sessão encerrada, o skeleton fica até a troca de tela.
          if (!sessionEnded) setIsLoading(false);
          setIsSearching(false);
          setIsLoadingMore(false);
        }
      }
    },
    [addToast],
  );

  const appliedSearch = searchText.trim();

  // Aba ou alvo novo é outra lista: busca na hora, já com o termo digitado.
  useEffect(() => {
    void fetchPage({ status, search: appliedSearch, targetUserId, targetEventId }, 'initial');
    // `appliedSearch` fica de fora de propósito: quem reage à digitação é o efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, targetUserId, targetEventId, fetchPage]);

  // Apagar o campo volta na hora para a lista completa; digitar espera o debounce.
  useEffect(() => {
    if (appliedSearch === filtersRef.current.search) return;
    const timer = setTimeout(
      () => {
        void fetchPage({ ...filtersRef.current, search: appliedSearch }, 'search');
      },
      appliedSearch ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [appliedSearch, fetchPage]);

  useFocusEffect(
    useCallback(() => {
      // O primeiro foco é a montagem: o efeito acima já buscou.
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }
      void fetchPage(filtersRef.current, 'refresh');
    }, [fetchPage]),
  );

  // Resposta atrasada de uma tela que já saiu é descartada.
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  const reload = useCallback(() => fetchPage(filtersRef.current, 'initial'), [fetchPage]);
  const refresh = useCallback(() => fetchPage(filtersRef.current, 'refresh'), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!hasMore || inFlight.current || loadMorePaused.current) return Promise.resolve();
    return fetchPage(filtersRef.current, 'more');
  }, [hasMore, fetchPage]);

  return { items, activeSearch, targetName, isLoading, isSearching, isLoadingMore, error, hasMore, reload, refresh, loadMore };
}
