import { useCallback, useEffect, useState } from 'react';

/**
 * Estado/Cidade do cadastro Pessoa Física. `LocationPicker` (genérico, US3.1 e
 * US7.5) ainda não existe e esta task não é dona dele — em vez de um stub,
 * usa a API pública do IBGE (sem chave, sem custo) direto pelos hooks, e a
 * tela filtra localmente pelo que for digitado no `TextField` (`type="Location"`).
 */
const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export type BrazilianState = { id: number; uf: string; name: string };
export type BrazilianCity = { id: number; name: string };

export function useBrazilianStates() {
  const [states, setStates] = useState<BrazilianState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${IBGE_BASE_URL}/estados?orderBy=nome`);
      if (!response.ok) throw new Error('http');

      const data = (await response.json()) as { id: number; sigla: string; nome: string }[];
      setStates(data.map((state) => ({ id: state.id, uf: state.sigla, name: state.nome })));
    } catch {
      setError('Não foi possível carregar os estados.');
      setStates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStates();
  }, [fetchStates]);

  return { states, isLoading, error, refetch: fetchStates };
}

/** `uf` nulo mantém a lista vazia — é assim que a tela deixa Cidade `disabled`. */
export function useBrazilianCities(uf: string | null) {
  const [cities, setCities] = useState<BrazilianCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uf) {
      setCities([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`${IBGE_BASE_URL}/estados/${uf}/municipios`)
      .then((response) => {
        if (!response.ok) throw new Error('http');
        return response.json() as Promise<{ id: number; nome: string }[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setCities(data.map((city) => ({ id: city.id, name: city.nome })));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Não foi possível carregar as cidades.');
        setCities([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uf]);

  return { cities, isLoading, error };
}
