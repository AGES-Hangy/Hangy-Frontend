import { useCallback, useEffect, useRef, useState } from 'react';

import type { FilterValue } from '@/components/FilterPanel/types';
import { useToast } from '@/components/Toast';
import { endpoints } from '@/constants/api';
import type { SearchAppliedFilters, SearchResponse } from '@/types/search';
import { describeLoadError, isApiErrorLike } from '@/utils/apiErrors';
import type { LoadError } from '@/utils/apiErrors';
import { apiFetch } from '@/utils/http';
import {
  EMPTY_APPLIED_FILTERS,
  fromAppliedFilters,
  hasActiveAppliedFilters,
  normalizeFilterValue,
} from '@/utils/searchFilters';

export const SEARCH_DEBOUNCE_MS = 400;
export const MIN_SEARCH_QUERY_LENGTH = 2;

function describeSearchLoadError(error: unknown): LoadError {
  const loadError = describeLoadError(error);
  if (loadError.kind === 'offline' || loadError.kind === 'timeout' || loadError.kind === 'server') {
    return loadError;
  }
  return describeLoadError(null);
}

/**
 * Busca textual categorizada (`GET /search`, task 121 [BE]) com debounce de
 * ~400 ms, mínimo de 2 caracteres (quando não há filtro ativo), descarte de
 * respostas antigas e filtros sincronizados com `applied_filters` da resposta.
 */
export function useSearch() {
  const { addToast } = useToast();
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);

  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef('');
  const resultsRef = useRef<SearchResponse | null>(null);
  // Guarda apenas o filtro da última requisição disparada para retry ou
  // enquanto a resposta com `applied_filters` ainda está em voo.
  const pendingFiltersRef = useRef<SearchAppliedFilters>(EMPTY_APPLIED_FILTERS);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      latestRequestIdRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const executeSearch = useCallback(
    async (rawQuery: string, filters: SearchAppliedFilters) => {
      const trimmed = rawQuery.trim();
      const q = trimmed.length >= MIN_SEARCH_QUERY_LENGTH ? trimmed : undefined;
      const hasFilters = hasActiveAppliedFilters(filters);

      if (!q && !hasFilters) {
        latestRequestIdRef.current += 1;
        resultsRef.current = null;
        setResults(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      const requestId = ++latestRequestIdRef.current;
      pendingFiltersRef.current = filters;
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch<SearchResponse>(
          endpoints.search({
            q,
            tagIds: filters.tag_ids,
            dateFrom: filters.date_from,
            dateTo: filters.date_to,
          }),
        );
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;

        resultsRef.current = response;
        pendingFiltersRef.current = response.applied_filters;
        setResults(response);
        setError(null);
      } catch (caught) {
        if (!isMountedRef.current || requestId !== latestRequestIdRef.current) return;
        // O `apiFetch` já limpa a sessão e redireciona ao Login no 401.
        if (isApiErrorLike(caught) && caught.status === 401) return;

        if (isApiErrorLike(caught) && caught.status === 404 && filters.tag_ids.length > 0) {
          addToast({ type: 'warning', message: 'Essa categoria não existe mais' });
          const withoutTags: SearchAppliedFilters = {
            tag_ids: [],
            date_from: filters.date_from,
            date_to: filters.date_to,
          };
          pendingFiltersRef.current = withoutTags;
          if (resultsRef.current) {
            resultsRef.current = { ...resultsRef.current, applied_filters: withoutTags };
          }
          void executeSearch(queryRef.current, withoutTags);
          return;
        }

        if (isApiErrorLike(caught) && caught.status === 400) {
          console.warn('[api] requisição inválida em /search:', caught.detail);
        }

        resultsRef.current = null;
        setResults(null);
        setError(describeSearchLoadError(caught));
      } finally {
        if (isMountedRef.current && requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [addToast],
  );

  const runWithFilters = useCallback(
    (nextFilters: SearchAppliedFilters) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      pendingFiltersRef.current = nextFilters;
      if (resultsRef.current) {
        resultsRef.current = { ...resultsRef.current, applied_filters: nextFilters };
      }
      void executeSearch(queryRef.current, nextFilters);
    },
    [executeSearch],
  );

  const setQuery = useCallback(
    (nextText: string) => {
      queryRef.current = nextText;
      setQueryState(nextText);

      // Invalida imediatamente qualquer requisição anterior em voo para que
      // uma resposta velha não sobrescreva o que o usuário está digitando.
      latestRequestIdRef.current += 1;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const currentFilters = resultsRef.current?.applied_filters ?? pendingFiltersRef.current;
      const canSearch =
        nextText.trim().length >= MIN_SEARCH_QUERY_LENGTH || hasActiveAppliedFilters(currentFilters);

      if (!canSearch) {
        resultsRef.current = null;
        setResults(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void executeSearch(nextText, currentFilters);
      }, SEARCH_DEBOUNCE_MS);
    },
    [executeSearch],
  );

  const submitSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const currentFilters = resultsRef.current?.applied_filters ?? pendingFiltersRef.current;
    if (queryRef.current.trim().length >= MIN_SEARCH_QUERY_LENGTH || hasActiveAppliedFilters(currentFilters)) {
      void executeSearch(queryRef.current, currentFilters);
    }
  }, [executeSearch]);

  const applyFilters = useCallback(
    (value: FilterValue) => {
      const normalized = normalizeFilterValue(value, 'Search');
      runWithFilters({
        tag_ids: normalized.tagIds,
        date_from: normalized.dateFrom ?? null,
        date_to: normalized.dateTo ?? null,
      });
    },
    [runWithFilters],
  );

  const removeTagFilter = useCallback(
    (tagId: string) => {
      const current = resultsRef.current?.applied_filters ?? pendingFiltersRef.current;
      runWithFilters({
        ...current,
        tag_ids: current.tag_ids.filter((id) => id !== tagId),
      });
    },
    [runWithFilters],
  );

  const removeDateFilter = useCallback(() => {
    const current = resultsRef.current?.applied_filters ?? pendingFiltersRef.current;
    runWithFilters({
      ...current,
      date_from: null,
      date_to: null,
    });
  }, [runWithFilters]);

  const clearFilters = useCallback(() => {
    runWithFilters(EMPTY_APPLIED_FILTERS);
  }, [runWithFilters]);

  const retry = useCallback(() => {
    const currentFilters = resultsRef.current?.applied_filters ?? pendingFiltersRef.current;
    void executeSearch(queryRef.current, currentFilters);
  }, [executeSearch]);

  // `applied_filters` da resposta é a fonte de verdade do que está ativo na listagem.
  const appliedFilters = results?.applied_filters ?? (isLoading || error ? pendingFiltersRef.current : EMPTY_APPLIED_FILTERS);
  const filterValue = fromAppliedFilters(appliedFilters);

  return {
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
  };
}

