import { useLayoutEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

import { TopAppBar } from '@/components/TopAppBar';
import type { TopAppBarProps } from '@/components/TopAppBar';

/**
 * Declara a barra superior da tela atual. Chame uma vez no corpo da tela:
 *
 *   useTopAppBar({ variant: 'Modal', title: 'Criar evento' });
 *
 * Sem isto vale o padrão do `(tabs)/_layout.tsx`: `Home` nas raízes de aba e
 * `Detail` (voltar + nome da pasta) nas telas de `(screens)`. Ou seja, só as
 * telas que fogem do padrão precisam chamar o hook.
 */
export function useTopAppBar(props: TopAppBarProps) {
  const navigation = useNavigation();
  const { variant, title, unreadCount } = props;

  // As callbacks e o slot de avatar mudam de identidade a cada render da tela.
  // Guardá-los numa ref deixa o header ler sempre o valor mais novo sem que a
  // troca de identidade reconfigure as opções a cada render — que é o laço de
  // setOptions que travaria a tela.
  const propsRef = useRef(props);
  propsRef.current = props;

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <TopAppBar {...propsRef.current} />,
    });
  }, [navigation, variant, title, unreadCount]);
}
