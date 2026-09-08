import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

import type { TopAppBarProps, TopAppBarVariant } from './types';

export type { TopAppBarAction, TopAppBarProps, TopAppBarVariant } from './types';

/** Altura da barra sem a safe area — o `insets.top` é somado por cima. */
const BAR_HEIGHT = 56;
/** Borda inferior das variantes claras. */
const BORDER_WIDTH = 1.5;
const ICON_SIZE = 24;
/**
 * Largura fixa dos slots laterais. Com os dois lados iguais, o título fica
 * centralizado na tela — e não entre os ícones, que mudam de largura conforme
 * a variante tem ou não ação à direita.
 */
const SLOT_WIDTH = 48;
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

function BarButton({
  icon,
  label,
  onPress,
  tint,
  children,
}: {
  icon: IconName;
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
  showBack = true,
  unreadCount = 0,
  onNotificationsPress,
  action,
}: TopAppBarProps) {
  const insets = useSafeAreaInsets();

  const isBrand = BRAND_VARIANTS.includes(variant);
  const isBordered = variant !== 'Home';
  const tint = isBrand ? colors.text.inverse : colors.text.primary;
  const goBack = onBack ?? (() => router.back());

  const showsLogo = variant === 'Home' || variant === 'BrandBack';
  const isModal = variant === 'Modal';

  // Ícone de saída: o Modal fecha o fluxo, as outras voltam um passo.
  const leaveIcon: IconName | null = isModal ? 'x' : variant === 'Home' ? null : 'arrow-left';

  return (
    <View
      // `height` no React Native inclui o padding e a borda, então a safe area
      // e a borda entram na altura total — senão o conteúdo é espremido dentro
      // dos 56 e as variantes ficam com alturas úteis diferentes.
      style={[
        styles.bar,
        isBrand ? styles.barBrand : styles.barSurface,
        isBordered && styles.barBordered,
        {
          height: BAR_HEIGHT + insets.top + (isBordered ? BORDER_WIDTH : 0),
          paddingTop: insets.top,
        },
      ]}
      accessibilityRole="header"
    >
      {/* A cor do conteúdo da status bar acompanha o fundo da barra. */}
      <StatusBar style={isBrand ? 'light' : 'dark'} />

      <View style={[styles.slot, styles.slotStart]}>
        {leaveIcon && showBack && (
          <BarButton
            icon={leaveIcon}
            label={isModal ? 'Fechar' : 'Voltar'}
            tint={tint}
            onPress={goBack}
          />
        )}
      </View>

      {showsLogo ? (
        <View style={styles.center}>
          <Logo />
        </View>
      ) : (
        <Text style={[styles.title, isModal && styles.titleLeft]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      )}

      <View style={[styles.slot, styles.slotEnd]}>
        {variant === 'Home' && (
          <BarButton
            icon="bell"
            label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
            tint={tint}
            onPress={onNotificationsPress ?? (() => router.push('/Notifications'))}
          >
            {unreadCount > 0 && <View style={styles.unreadDot} />}
          </BarButton>
        )}

        {variant !== 'Home' && action && (
          <BarButton
            icon={action.icon}
            label={action.accessibilityLabel}
            tint={tint}
            onPress={action.onPress}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[16],
  },
  barBrand: {
    backgroundColor: colors.action.primary,
  },
  barSurface: {
    backgroundColor: colors.bg.base,
  },
  barBordered: {
    borderBottomWidth: BORDER_WIDTH,
    borderBottomColor: colors.border.default,
  },
  // Os dois slots têm a mesma largura, então o que fica entre eles é o centro
  // da tela. O Figma tem um nó "Spacer" com esse papel e a documentação do
  // componente diz para não renderizar nada nele.
  slot: {
    width: SLOT_WIDTH,
    justifyContent: 'center',
  },
  slotStart: {
    alignItems: 'flex-start',
  },
  slotEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
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
