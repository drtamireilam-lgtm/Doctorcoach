/** Pure interaction policy, shared by the viewer and regression tests. */
export function muscleFromHash(hash: string, validIds: readonly string[]): string {
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    return validIds.includes(id) ? id : 'pectoralis-major';
  } catch {
    return 'pectoralis-major';
  }
}
export function nextZoomDistance(currentDistance: number, direction: number): number {
  return Math.max(3, Math.min(10, currentDistance - direction * .5));
}
export function isSelectionClick(pointerDistance: number): boolean {
  return Number.isFinite(pointerDistance) && pointerDistance <= 4;
}
