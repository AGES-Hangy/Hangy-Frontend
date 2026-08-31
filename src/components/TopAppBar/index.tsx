import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { TopAppBarProps, TopAppBarVariant } from './types';

export type { TopAppBarProps, TopAppBarVariant } from './types';

/** Altura da barra sem a safe area — o `insets.top` é somado por cima. */
const BAR_HEIGHT = 56;
/** Lado do ícone e do espaçador que mantém o título opticamente centralizado. */
const ICON_SIZE = 24;
/** Avatar do Home. */
const AVATAR_SIZE = 36;
const AVATAR_ICON_SIZE = 20;
/** Logo Hangy: 70x27 no frame do Figma. */
const LOGO_WIDTH = 70;
const LOGO_HEIGHT = 27;
/**
 * Ponto de não lidas do sino: 9 de diâmetro com anel de 2 na cor da barra,
 * sobrando 5 de vermelho no meio. Ancorado meio para fora do topo do ícone,
 * como no frame.
 */
const DOT_SIZE = 9;
const DOT_BORDER = 2;
const DOT_TOP = -2;
const DOT_LEFT = 15;

/** Área de toque mínima de 44 em cima de um ícone de 24. */
const ICON_HIT_SLOP = (44 - ICON_SIZE) / 2;

/** Variantes com fundo roxo — ícones e texto saem em `text/inverse`. */
const BRAND_VARIANTS: TopAppBarVariant[] = ['Home', 'BrandBack'];

/**
 * Espaçador do tamanho de um ícone. O Figma tem um nó "Spacer" com esse papel
 * e a própria documentação do componente diz para não renderizar nada nele —
 * ele só existe para o item do meio ficar centralizado.
 */
function Spacer({ size = ICON_SIZE }: { size?: number }) {
  return <View style={{ width: size, height: size }} />;
}

function BarButton({
  icon,
  label,
  onPress,
  tint,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress?: () => void;
  tint: string;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={ICON_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View>
        <Icon name={icon} color={tint} />
        {children}
      </View>
    </Pressable>
  );
}

function Logo() {
  return (
    <Image
      source={require('../../../assets/images/logo.svg')}
      style={styles.logo}
      contentFit="contain"
      accessibilityLabel="Hangy"
    />
  );
}

export function TopAppBar({
  variant = 'Home',
  title,
  onBack,
  unreadCount = 0,
  onNotificationsPress,
  avatar,
  onAvatarPress,
  onShare,
  onReport,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();

  const isBrand = BRAND_VARIANTS.includes(variant);
  const tint = isBrand ? colors.text.inverse : colors.text.primary;
  const goBack = onBack ?? (() => router.back());

  const barStyle = [
    styles.bar,
    isBrand ? styles.barBrand : styles.barSurface,
    // O Home é a única variante sem borda inferior no Figma.
    variant !== 'Home' && styles.barBordered,
    // O Modal alinha o título à esquerda; as outras distribuem os três itens.
    variant === 'Modal' ? styles.barLeftAligned : styles.barSpaced,
  ];

  return (
    // `height` no React Native inclui o padding, então a altura total tem de
    // somar a safe area — senão o conteúdo é espremido dentro dos 56.
    <View style={[barStyle, { height: BAR_HEIGHT + insets.top, paddingTop: insets.top }]}>
      {variant === 'Home' && (
        <>
          {avatar ? (
            <Pressable
              onPress={onAvatarPress}
              hitSlop={(44 - AVATAR_SIZE) / 2}
              accessibilityRole="button"
              accessibilityLabel="Abrir meu perfil"
            >
              {avatar}
            </Pressable>
          ) : (
            // Sem o componente Avatar ainda, reservamos o espaço para o logo
            // continuar centralizado — é o que o frame do Figma faz.
            <Spacer size={AVATAR_SIZE} />
          )}

          <Logo />

          <BarButton
            icon="bell"
            label={
              unreadCount > 0
                ? `Notificações, ${unreadCount} não lidas`
                : 'Notificações'
            }
            tint={tint}
            onPress={onNotificationsPress ?? (() => router.push('/Notifications'))}
          >
            {unreadCount > 0 && <View style={styles.unreadDot} />}
          </BarButton>
        </>
      )}

      {(variant === 'Detail' || variant === 'Profile') && (
        <>
          <BarButton icon="arrow-left" label="Voltar" tint={tint} onPress={goBack} />

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {variant === 'Detail' && onShare && (
            <BarButton icon="share" label="Compartilhar" tint={tint} onPress={onShare} />
          )}
          {variant === 'Profile' && onReport && (
            <BarButton icon="flag" label="Denunciar" tint={tint} onPress={onReport} />
          )}
          {((variant === 'Detail' && !onShare) || (variant === 'Profile' && !onReport)) && <Spacer />}
        </>
      )}

      {variant === 'Modal' && (
        <>
          <BarButton icon="x" label="Fechar" tint={tint} onPress={goBack} />

          <Text style={[styles.title, styles.titleLeft]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}

      {variant === 'BrandBack' && (
        <>
          <BarButton icon="arrow-left" label="Voltar" tint={tint} onPress={goBack} />
          <Logo />
          <Spacer />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
  },
  barSpaced: {
    justifyContent: 'space-between',
  },
  barLeftAligned: {
    gap: spacing[16],
  },
  barBrand: {
    backgroundColor: colors.action.primary,
  },
  barSurface: {
    backgroundColor: colors.bg.base,
  },
  barBordered: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border.default,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  title: {
    ...typography.h4,
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
  },
  titleLeft: {
    textAlign: 'left',
  },
  unreadDot: {
    position: 'absolute',
    top: DOT_TOP,
    left: DOT_LEFT,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: palette.error.default,
    // O anel na cor da barra recorta o ponto do sino, como no frame.
    borderWidth: DOT_BORDER,
    borderColor: colors.action.primary,
  },
});
