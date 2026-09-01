// Hangy — Style Guide (03 · RAIO, ESPACAMENTO E ELEVACAO)

import { palette } from '@/constants/colors';

export const radius = {
  xs: 6,
  sm: 10,
  // Figma Components/EventCard: radius/sm
  eventCardSm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

// Grade de 4pt
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

export const layout = {
  badge: {
    height: 24,
    paddingHorizontal: 10,
    iconSize: 12,
    borderWidth: 1.5,
    notificationDotSize: 10,
    notificationPillHeight: 10,
    notificationMinWidth: 10,
    notificationOffset: 1,
  },
} as const;

// Sombras — offset/blur em px (CSS) convertidos para shadow* do React Native;
// `elevation` cobre a sombra equivalente no Android.
export const elevation = {
  1: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  2: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  3: {
    shadowColor: palette.neutral[950],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
  },
} as const;
