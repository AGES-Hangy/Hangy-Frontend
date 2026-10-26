/**
 * Aplica uma opacidade (0–1) a um token de cor hexadecimal (`#RGB` ou
 * `#RRGGBB`) de `@/constants/colors`, devolvendo `rgba(...)`.
 *
 * Use quando a opacidade precisa fazer parte da própria cor — por exemplo em
 * `fillColor`/`strokeColor` do `react-native-maps`, que não têm `opacity` —
 * em vez de escrever um `rgba(...)` literal no componente.
 *
 * ```ts
 * withAlpha(colors.action.primary, 0.16) // 'rgba(119, 71, 126, 0.16)'
 * ```
 */
export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`withAlpha: cor hexadecimal inválida "${hex}"`);
  }

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.min(1, Math.max(0, alpha));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
