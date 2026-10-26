/** Invalidate relationship-dependent data after a confirmed block/unblock. */
const listeners = new Set<() => void>();
export function invalidateRelationships() {
  listeners.forEach((listener) => listener());
}
export function onRelationshipsChanged(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
