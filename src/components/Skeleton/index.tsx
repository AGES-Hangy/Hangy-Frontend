import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { layout, radius as radiusScale, spacing } from '@/constants/layout';
import type { SkeletonBlockProps, SkeletonPresetProps, SkeletonProps } from './types';

const metrics = layout.skeleton;

/**
 * Placeholder de carregamento (task 165): blocos em neutral/100 pulsando a cada 1.2s.
 *
 * - `<Skeleton type="Card" />` e `<Skeleton type="Item" />` são as variantes do
 *   Figma, com a métrica do `EventCard` (Featured / Compact) para a lista não
 *   saltar quando os dados chegam. São anunciadas uma vez, como "Carregando".
 * - `<Skeleton width height radius />` é o bloco solto para quem monta o
 *   skeleton da própria tela; é decorativo, e o container dessa tela anuncia
 *   o carregamento.
 */
export function Skeleton(props: SkeletonProps) {
  return props.type ? <SkeletonPreset {...props} /> : <StandaloneBlock {...props} />;
}

/**
 * Opacidade pulsando no driver nativo — pulso em JS trava junto com a lista.
 * Com "reduzir movimento" ligado, o bloco fica parado.
 */
function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    const half = { duration: layout.skeleton.pulseDuration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true };
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: layout.skeleton.pulseMinOpacity, ...half }),
        Animated.timing(opacity, { toValue: 1, ...half }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return opacity;
}

function StandaloneBlock(props: SkeletonBlockProps) {
  const opacity = useSkeletonPulse();
  return <Block {...props} opacity={opacity} />;
}

function Block({
  width = '100%',
  height,
  radius = 'sm',
  style,
  opacity,
}: SkeletonBlockProps & { opacity: Animated.Value }) {
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius: radiusScale[radius], opacity }, style]}
    />
  );
}

function SkeletonPreset({ type, accessibilityLabel = 'Carregando', style }: SkeletonPresetProps) {
  // Um só valor para todos os blocos do card: pulsam juntos, e a borda não pulsa.
  const opacity = useSkeletonPulse();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[styles.chrome, type === 'Card' ? styles.card : styles.item, style]}
    >
      {type === 'Card' ? (
        <>
          <Block height={layout.eventCard.featuredImageHeight} radius="md" opacity={opacity} />
          <Block width={metrics.cardTitleWidth} height={metrics.cardTitleHeight} radius="full" opacity={opacity} />
          <Block width={metrics.cardLineWidth} height={metrics.lineHeight} radius="full" opacity={opacity} />
          <Block width={metrics.cardLineShortWidth} height={metrics.lineHeight} radius="full" opacity={opacity} />
          <View style={styles.cardFooter}>
            <Block width={metrics.cardPillWidth} height={metrics.pillHeight} radius="full" opacity={opacity} />
            <Block width={metrics.cardPillShortWidth} height={metrics.pillHeight} radius="full" opacity={opacity} />
          </View>
        </>
      ) : (
        <>
          <Block
            width={layout.eventCard.compactImageSize}
            height={layout.eventCard.compactImageSize}
            radius="sm"
            opacity={opacity}
          />
          <View style={styles.itemContent}>
            <Block width={metrics.itemTitleWidth} height={metrics.itemTitleHeight} radius="full" opacity={opacity} />
            <Block width={metrics.itemLineWidth} height={metrics.lineHeight} radius="full" opacity={opacity} />
            <Block width={metrics.itemLineShortWidth} height={metrics.lineHeight} radius="full" opacity={opacity} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // `maxWidth`: as barras têm a largura do frame de 520; no `Item` fluido de
  // um celular estreito elas encolhem em vez de vazar da coluna.
  block: {
    backgroundColor: colors.surface.sunken,
    maxWidth: '100%',
  },
  // Mesmo fundo e borda do `EventCard` (`cardFlat`): a borda conta na métrica.
  chrome: {
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  // Featured — w320 h288 r20, padding e gaps do card real.
  card: {
    width: layout.eventCard.featuredWidth,
    height: layout.eventCard.featuredHeight,
    borderRadius: radiusScale.lg,
    gap: spacing[8],
    paddingTop: spacing[8],
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[16],
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  // Compact / ListItem — w100% (máx 520) h88 r14. O frame é fixo em 520, mas
  // o card real é fluido: fixar aqui faria a lista saltar no celular.
  item: {
    width: '100%',
    maxWidth: layout.eventCard.compactMaxWidth,
    height: layout.eventCard.compactHeight,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radiusScale.md,
    padding: spacing[8],
    gap: spacing[12],
  },
  itemContent: {
    flex: 1,
    gap: spacing[8],
  },
});

export type { SkeletonBlockProps, SkeletonPresetProps, SkeletonProps, SkeletonType } from './types';
