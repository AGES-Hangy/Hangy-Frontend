// Hangy — Style Guide (01 · COR)

export const palette = {
  primary: {
    50: '#F8F3F9',
    100: '#EFE2F1',
    200: '#DFC6E3',
    300: '#C7A2CC',
    400: '#A876B0',
    500: '#77477E',
    600: '#653B6B',
    700: '#512F57',
    800: '#3D2342',
    900: '#2A182E',
  },
  secondary: {
    50: '#FFF8E3',
    100: '#FFEFB8',
    200: '#FFE377',
    300: '#FFD42E',
    400: '#FFC501',
    500: '#FE9600',
    600: '#D67900',
    700: '#A85D00',
  },
  tertiary: {
    100: '#FFFCE6',
    200: '#FFF8B8',
    300: '#FFEE4A',
    400: '#F2DB18',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8F7FA',
    100: '#F0EEF4',
    200: '#E2DFE9',
    300: '#CAC5D4',
    400: '#9F99AC',
    500: '#767085',
    600: '#544E62',
    700: '#3A3547',
    800: '#232030',
    900: '#131022',
    950: '#03001C',
  },
  success: {
    bg: '#E6F5EE',
    border: '#8FD3B4',
    default: '#128A54',
  },
  error: {
    bg: '#FDECEE',
    border: '#F2A8AF',
    default: '#D33A45',
  },
  warning: {
    bg: '#FDF0E7',
    border: '#F7C09B',
    default: '#E8590C',
  },
  info: {
    bg: '#EAF1FD',
    border: '#A9C4F5',
    default: '#2F6FE4',
  },
} as const;

// Tokens de aplicacao — mapeados a partir da paleta acima
export const colors = {
  bg: {
    base: palette.neutral[0],
    subtle: palette.neutral[50],
    inverse: palette.neutral[950],
  },
  surface: {
    card: palette.neutral[0],
    sunken: palette.neutral[100],
  },
  border: {
    default: palette.neutral[200],
    strong: palette.neutral[300],
    focus: palette.primary[500],
  },
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[600],
    tertiary: palette.neutral[400],
    inverse: palette.neutral[0],
    brand: palette.primary[500],
    disabled: palette.neutral[300],
  },
  action: {
    primary: palette.primary[500],
    primaryPressed: palette.primary[700],
    secondary: palette.secondary[400],
    danger: palette.error.default,
  },
  feedback: {
    success: palette.success.default,
    error: palette.error.default,
  },
} as const;
