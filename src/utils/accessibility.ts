import type { View } from 'react-native';

// Versão web. A nativa fica em accessibility.native.ts: o react-native-web
// deixa `announceForAccessibility` vazio e não implementa
// `sendAccessibilityEvent`.

export type Politeness = 'polite' | 'assertive';

const ANNOUNCE_DELAY_MS = 100;

const regions: Partial<Record<Politeness, HTMLElement>> = {};
const timers: Partial<Record<Politeness, ReturnType<typeof setTimeout>>> = {};

function createRegion(politeness: Politeness): HTMLElement {
  const region = document.createElement('div');
  region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  // Padrão "sr-only": some da tela, mas não do leitor de tela, o que
  // `display: none` ou `visibility: hidden` fariam.
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    border: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(region);
  return region;
}

function getRegion(politeness: Politeness): HTMLElement {
  regions[politeness] ??= createRegion(politeness);
  return regions[politeness];
}

// Ao carregar o módulo, e não no primeiro anúncio: alguns leitores de tela só
// acompanham uma região que já estava na página.
if (typeof document !== 'undefined' && document.body) {
  getRegion('polite');
  getRegion('assertive');
}

export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (typeof document === 'undefined') return;
  const region = getRegion(politeness);
  clearTimeout(timers[politeness]);
  // Esvaziar antes de escrever: o mesmo texto gravado de novo, sem uma troca
  // no meio, não é lido outra vez.
  region.textContent = '';
  timers[politeness] = setTimeout(() => {
    region.textContent = message;
  }, ANNOUNCE_DELAY_MS);
}

// No web, a ref de uma `View` é o próprio elemento do DOM.
function toElement(node: View): HTMLElement {
  return node as unknown as HTMLElement;
}

export function moveAccessibilityFocus(node: View): void {
  const element = toElement(node);
  // Sem `tabindex`, uma `div` não recebe foco por script; `-1` não a põe na
  // ordem do Tab. Fica aqui, e não como prop na tela, porque no Android a prop
  // `tabIndex` muda o `focusable` da View.
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  // Quem chama já rola até o campo com animação.
  element.focus({ preventScroll: true });
}

export function restoreLostFocus(node: View): void {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  // Sem caixas, o elemento está escondido, por exemplo numa tela que não é a atual.
  if (toElement(node).getClientRects().length === 0) return;
  moveAccessibilityFocus(node);
}
