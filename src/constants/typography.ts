// Hangy — Style Guide (02 · TIPOGRAFIA)
// Familia: Inter (fallback: system-ui / SF Pro / Roboto). O logo Hangy mantem
// sua propria fonte display — esta escala e so para o texto da interface.

export const fontFamily = {
  base: 'Inter',
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: 1.0 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: 0.7 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.5 },
  h3: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: 0.3 },
  h4: { fontSize: 16, lineHeight: 22, fontWeight: '700', letterSpacing: 0.2 },
  bodyL: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: -0.1 },
  bodyM: { fontSize: 14, lineHeight: 21, fontWeight: '400', letterSpacing: 0 },
  bodyS: { fontSize: 12, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  labelL: { fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
  labelM: { fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0 },
  labelS: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.1 },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '500', letterSpacing: 0.2 },
  badge: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1 },
} as const;
