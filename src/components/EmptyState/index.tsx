import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, palette } from '@/constants/colors';
import { icons } from '@/components/Icon/icons';
import type { EmptyStateContext, EmptyStateProps } from './types';

type EmptyStateConfig = {
  icon: keyof typeof icons;
  title: string;
  text: string;
  textByCta?: { true: string; false: string };
  defaultCtaLabel?: string;
};

const EMPTY_STATE_CONFIG: Record<EmptyStateContext, EmptyStateConfig> = {
  Home: {
    icon: 'compass',
    title: 'Nada por aqui ainda',
    text: 'Escolha mais interesses para o feed encher.',
    defaultCtaLabel: 'Editar interesses',
  },
  Map: {
    icon: 'map-pin',
    title: 'Nenhum evento por perto',
    text: 'Aumente o raio de busca ou crie o seu.',
    defaultCtaLabel: 'Criar evento',
  },
  Search: {
    icon: 'search',
    title: 'Sem resultados',
    text: 'Tente outra tag ou mude o intervalo de datas.',
  },
  Photos: {
    icon: 'camera',
    title: 'Sem registros',
    text: 'As fotos dos eventos que você for aparecem aqui.',
  },
  MyEvents: {
    icon: 'calendar-x',
    title: 'Nenhum evento por aqui',
    text: 'Quando você confirmar presença em um evento, ele aparece aqui.',
    textByCta: {
      true: 'Os eventos que você criar vão aparecer nesta lista.',
      false: 'Quando você confirmar presença em um evento, ele aparece aqui.',
    },
    defaultCtaLabel: 'Criar evento',
  },
};

export function EmptyState({ context, cta = false, ctaLabel, onCtaPress }: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[context];
  const Icon = icons[config.icon];
  const text = config.textByCta ? config.textByCta[cta ? 'true' : 'false'] : config.text;
  const resolvedCtaLabel = ctaLabel ?? config.defaultCtaLabel;

  if (__DEV__ && cta && !resolvedCtaLabel) {
    console.warn(
      `[EmptyState] context="${context}" tem cta=true mas nenhum ctaLabel (prop ou padrão) foi definido.`
    );
  }
  if (__DEV__ && cta && !onCtaPress) {
    console.warn(`[EmptyState] context="${context}" tem cta=true mas onCtaPress não foi passado.`);
  }

  return (
    <View style={styles.container} accessible={false}>
      <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
        <Icon size={40} color={colors.action.primary} strokeWidth={2} />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {config.title}
      </Text>

      <Text style={styles.text}>{text}</Text>

      {cta && resolvedCtaLabel ? (
        <Pressable
          onPress={onCtaPress}
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={resolvedCtaLabel}
        >
          <Text style={styles.ctaLabel}>{resolvedCtaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },

  illustration: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },

  text: {
    fontSize: 16,
    color: palette.neutral[500],
    textAlign: 'center',
    maxWidth: 260,
  },

  ctaButton: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: colors.action.primary,
  },

  ctaButtonPressed: {
    backgroundColor: colors.action.primaryPressed,
  },

  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.inverse,
  },
});