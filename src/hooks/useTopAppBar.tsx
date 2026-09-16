import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';

import { TopAppBar } from '@/components/TopAppBar';
import type { TopAppBarProps } from '@/components/TopAppBar';

/** Barra padrão de todas as telas: a da Home, com logo e sino. */
const DEFAULT_BAR: TopAppBarProps = { variant: 'Home' };

/**
 * Estado da barra: os props dela, `'hidden'` quando a tela desenha a própria
 * (é o caso do hero do detalhe de evento, que tem os botões por cima da capa)
 * ou `null` quando ninguém pediu nada e vale o padrão.
 */
type BarState = TopAppBarProps | 'hidden';

const TopAppBarContext = createContext<{
  bar: BarState;
  setBar: (bar: BarState | null) => void;
} | null>(null);

/**
 * Guarda a barra da tela em foco. Fica em contexto, e não em
 * `navigation.setOptions`, porque o `screenOptions` do navegador reaplica o
 * padrão a cada render dele — o que sobrescrevia, de forma imprevisível, a
 * barra que a tela tinha acabado de pedir.
 */
export function TopAppBarProvider({ children }: { children: ReactNode }) {
  const [bar, setBarState] = useState<BarState | null>(null);

  const value = useMemo(
    () => ({
      bar: bar ?? DEFAULT_BAR,
      setBar: setBarState,
    }),
    [bar],
  );

  return <TopAppBarContext.Provider value={value}>{children}</TopAppBarContext.Provider>;
}

/** Renderiza a barra da tela em foco. É o `header` do `(tabs)/_layout.tsx`. */
export function TopAppBarSlot() {
  const context = useContext(TopAppBarContext);
  const bar = context?.bar ?? DEFAULT_BAR;

  if (bar === 'hidden') return null;

  return <TopAppBar {...bar} />;
}

/**
 * Declara a barra superior da tela atual. Chame uma vez no corpo da tela:
 *
 *   useTopAppBar({ variant: 'Modal', title: 'Criar evento' });
 *
 * Sem isto vale o padrão (a barra da Home) — só as telas que fogem dele
 * chamam o hook.
 *
 * Passe `null` para a tela não ter barra nenhuma. É o caso de quem desenha a
 * própria: o detalhe do evento põe voltar, favoritar e gerenciar por cima da
 * capa, e uma barra em cima disso seria uma segunda linha de botões.
 */
export function useTopAppBar(props: TopAppBarProps | null) {
  const context = useContext(TopAppBarContext);
  const setBar = context?.setBar;

  const { variant, title, unreadCount, showBack } = props ?? {};
  const hidden = props === null;
  const action = props?.action;
  const actionRef = useRef(action);
  actionRef.current = action;
  const onBack = props?.onBack;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // A barra fica no contexto enquanto a tela está em foco. As callbacks leem
  // a versão mais recente de `action`/`onBack`, inclusive após o GET, sem
  // reinstalar a barra a cada render nem capturar uma closure velha (ex.:
  // `onBack` decidindo com base num estado que só existia na primeira
  // montagem).
  const bar = useMemo<BarState>(
    () => (props === null ? 'hidden' : {
      ...props,
      onBack: onBack ? () => onBackRef.current?.() : undefined,
      action: action ? { ...action, onPress: () => actionRef.current?.onPress?.() } : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hidden, variant, title, unreadCount, showBack, Boolean(onBack), action?.icon, action?.accessibilityLabel],
  );

  // No foco, e não na montagem: numa tab bar as telas continuam montadas ao
  // trocar de aba, então um efeito de montagem rodaria uma única vez só. A
  // limpeza devolve o padrão, senão a barra de uma tela vazaria para a
  // seguinte que não pede nada.
  useFocusEffect(
    useCallback(() => {
      setBar?.(bar);
      return () => setBar?.(null);
    }, [setBar, bar]),
  );
}
