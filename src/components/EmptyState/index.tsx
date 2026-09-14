import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, palette } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
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
    text: 'Ainda não encontramos eventos para mostrar.',
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

export function EmptyState({
  context,
  cta = false,
  ctaLabel,
  onCtaPress,
  ctaAtBottom = false,
  ctaDisabled = false,
  title,
  text: textOverride,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[context];
  const Icon = icons[config.icon];
  const text =
    textOverride ?? (config.textByCta ? config.textByCta[cta ? 'true' : 'false'] : config.text);
  const resolvedCtaLabel = ctaLabel ?? config.defaultCtaLabel;

  if (__DEV__ && cta && !resolvedCtaLabel) {
    console.warn(
      `[EmptyState] context="${context}" tem cta=true mas nenhum ctaLabel (prop ou padrão) foi definido.`
    );
  }
  if (__DEV__ && cta && !ctaDisabled && !onCtaPress) {
    console.warn(`[EmptyState] context="${context}" tem cta=true mas onCtaPress não foi passado.`);
  }

  return (
    <View style={[styles.container, ctaAtBottom && styles.containerCtaAtBottom]} accessible={false}>
      <View style={[styles.body, ctaAtBottom && styles.centeredContent]}>
        <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no">
          <Icon size={40} color={colors.action.primary} strokeWidth={2} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {title ?? config.title}
        </Text>

        <Text style={styles.text}>{text}</Text>
      </View>

      {cta && resolvedCtaLabel ? (
        <Pressable
          onPress={onCtaPress}
          disabled={ctaDisabled}
          accessibilityState={{ disabled: ctaDisabled }}
          aria-disabled={ctaDisabled}
          style={({ pressed }) => [styles.ctaButton, ctaAtBottom && styles.ctaAtBottom, ctaDisabled && styles.ctaButtonDisabled, pressed && styles.ctaButtonPressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={resolvedCtaLabel}
        >
          <Text style={[styles.ctaLabel, ctaDisabled && styles.ctaLabelDisabled]}>{resolvedCtaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[32],
    gap: spacing[12],
  },
  containerCtaAtBottom: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[16],
  },
  /**
   * Sem isto, a `illustration` (largura fixa, menor que o texto) cai no
   * `flex-start` do `stretch` padrão em vez de ficar centralizada — o título
   * e o texto centralizam sozinhos via `textAlign`, mas o círculo não.
   */
  body: {
    alignItems: 'center',
    gap: spacing[12],
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },

  illustration: {
    width: layout.emptyState.illustrationSize,
    height: layout.emptyState.illustrationSize,
    borderRadius: radius.full,
    backgroundColor: palette.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
  },

  text: {
    ...typography.bodyM,
    color: palette.neutral[500],
    textAlign: 'center',
    maxWidth: layout.emptyState.textMaxWidth,
  },

  ctaButton: {
    marginTop: spacing[8],
    minHeight: layout.emptyState.ctaHeight,
    paddingHorizontal: spacing[20],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
  },
  ctaAtBottom: {
    marginTop: spacing[16],
    alignSelf: 'stretch',
  },

  ctaButtonDisabled: {
    backgroundColor: colors.surface.sunken,
  },

  ctaButtonPressed: {
    backgroundColor: colors.action.primaryPressed,
  },

  ctaLabel: {
    ...typography.labelM,
    color: colors.text.inverse,
  },
  ctaLabelDisabled: {
    color: colors.text.disabled,
  },
});
