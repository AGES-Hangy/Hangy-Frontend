import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { SessionLoadError } from '@/components/SessionLoadError';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useSessionRole } from '@/hooks/useSessionRole';
import { homeRouteFor } from '@/utils/homeRoute';

/**
 * Dimensões do frame Splash no Figma (nó 1693:9) — o viewBox fixo com
 * `preserveAspectRatio="xMidYMid slice"` reproduz o fundo em qualquer
 * tamanho de tela, como um background-size: cover.
 */
const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 874;

/** Tempo mínimo exibindo a splash, pra não piscar em sessões que resolvem rápido demais. */
const MIN_VISIBLE_MS = 1000;

export default function Splash() {
  // Com sessão salva, o papel vem do `GET /users/me` em paralelo ao tempo
  // mínimo, para a ida à rede não somar espera visível.
  const { state, retry } = useSessionRole();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!minElapsed) return;
    if (state.status === 'anonymous') router.replace('/Login');
    else if (state.status === 'ready') router.replace(homeRouteFor(state.role));
  }, [minElapsed, state]);

  const loadError = minElapsed && state.status === 'error' ? state.error : null;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando o Hangy"
    >
      <StatusBar style="light" />
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Glow lavanda, canto superior esquerdo — primary/300 a primary/600 */}
          <RadialGradient
            id="glowLavender"
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(-342.557 -299.039 348.941 -292.489 55.8614 61.7016)"
          >
            <Stop offset="0" stopColor={palette.primary[300]} />
            <Stop offset="0.3" stopColor={palette.primary[400]} />
            <Stop offset="0.6" stopColor={palette.primary[500]} />
            <Stop offset="0.9" stopColor={palette.primary[600]} />
          </RadialGradient>
          {/* Glow âmbar, canto inferior direito — secondary/300-400 esmaecendo em primary/500-600 */}
          <RadialGradient
            id="glowAmber"
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(-324.967 -285.339 331.023 -279.089 403.993 892.398)"
          >
            <Stop offset="0" stopColor={palette.secondary[300]} />
            <Stop offset="0.3" stopColor={palette.secondary[400]} />
            <Stop offset="0.737308" stopColor={palette.primary[500]} />
            <Stop offset="0.903846" stopColor={palette.primary[600]} />
          </RadialGradient>
        </Defs>

        <Rect width={FRAME_WIDTH} height={FRAME_HEIGHT} fill={palette.primary[600]} />
        <Ellipse
          cx="0"
          cy="0.5"
          rx="370"
          ry="316.5"
          transform="rotate(-180 0 0.5)"
          fill="url(#glowLavender)"
        />
        <Ellipse cx="351" cy="834" rx="351" ry="302" fill="url(#glowAmber)" />
      </Svg>

      <Image
        source={require('../../../assets/images/logo.svg')}
        style={styles.logo}
        contentFit="contain"
        accessible={false}
      />
      {loadError && (
        <SessionLoadError title={loadError.title} message={loadError.message} onRetry={retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[32],
    backgroundColor: palette.primary[600],
  },
  logo: {
    width: 300,
    height: 113,
  },
});
