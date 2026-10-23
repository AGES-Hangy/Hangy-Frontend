import { AccessibilityInfo, type View } from 'react-native';

export type Politeness = 'polite' | 'assertive';

// `politeness` só vale no web; aqui o anúncio sai como sempre saiu.
export function announce(message: string, _politeness: Politeness = 'polite'): void {
  AccessibilityInfo.announceForAccessibility(message);
}

export function moveAccessibilityFocus(node: View): void {
  AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
}

// Só o web perde o foco do teclado para o `body` quando o botão focado some.
export function restoreLostFocus(_node: View): void {}
