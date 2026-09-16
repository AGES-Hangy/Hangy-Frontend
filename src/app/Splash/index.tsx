import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/constants/colors';
import { getToken } from '@/utils/auth';

/**
 * Dimensões do frame Splash no Figma (nó 1693:9) — o viewBox fixo com
 * `preserveAspectRatio="xMidYMid slice"` reproduz o fundo em qualquer
 * tamanho de tela, como um background-size: cover.
 */
const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 874;

export default function Splash() {
  useEffect(() => {
    let isMounted = true;

    getToken().then((token) => {
      if (!isMounted) return;
      router.replace(token ? '/Home' : '/Login');
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
        style={StyleSheet.absoluteFillObject}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary[600],
  },
  logo: {
    width: 300,
    height: 113,
  },
});
