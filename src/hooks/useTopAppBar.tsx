import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

import { TopAppBar } from '@/components/TopAppBar';
import type { TopAppBarProps } from '@/components/TopAppBar';

/** Barra padrão de todas as telas: a da Home, com logo e sino. */
const DEFAULT_BAR: TopAppBarProps = { variant: 'Home' };

const TopAppBarContext = createContext<{
  bar: TopAppBarProps | null | undefined;
  setBar: (bar: TopAppBarProps | null | undefined) => void;
} | null>(null);

/**
 * Guarda a barra da tela em foco. Fica em contexto, e não em
 * `navigation.setOptions`, porque o `screenOptions` do navegador reaplica o
 * padrão a cada render dele — o que sobrescrevia, de forma imprevisível, a
 * barra que a tela tinha acabado de pedir.
 */
export function TopAppBarProvider({ children }: { children: ReactNode }) {
  // `undefined` significa a barra padrão; `null`, nenhuma barra.
  const [bar, setBarState] = useState<TopAppBarProps | null | undefined>(undefined);

  const value = useMemo(
    () => ({
      bar,
      setBar: setBarState,
    }),
    [bar],
  );

  return <TopAppBarContext.Provider value={value}>{children}</TopAppBarContext.Provider>;
}

/** Renderiza a barra da tela em foco. É o `header` do `(tabs)/_layout.tsx`. */
export function TopAppBarSlot() {
  const context = useContext(TopAppBarContext);
  const bar = context?.bar;
  if (bar === null) return null;
  return <TopAppBar {...(bar ?? DEFAULT_BAR)} />;
}

/**
 * Declara a barra superior da tela atual. Chame uma vez no corpo da tela:
 *
 *   useTopAppBar({ variant: 'Modal', title: 'Criar evento' });
 *
 * Sem isto vale o padrão (a barra da Home) — só as telas que fogem dele
 * chamam o hook.
 */
export function useTopAppBar(props: TopAppBarProps | null) {
  const context = useContext(TopAppBarContext);
  const setBar = context?.setBar;

  const { variant, title, unreadCount, showBack } = props ?? {};

  // Depende só dos valores que mudam a aparência: `action` e as callbacks
  // trocam de identidade a cada render e reexecutariam o efeito à toa.
  const bar = useMemo(
    () => props,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, title, unreadCount, showBack],
  );

  // No foco, e não na montagem: numa tab bar as telas continuam montadas ao
  // trocar de aba, então um efeito de montagem rodaria uma única vez só. A
  // limpeza devolve o padrão, senão a barra de uma tela vazaria para a
  // seguinte que não pede nada.
  useFocusEffect(
    useCallback(() => {
      setBar?.(bar);
      return () => setBar?.(undefined);
    }, [setBar, bar]),
  );
}
