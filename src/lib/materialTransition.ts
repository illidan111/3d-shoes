/** Time-based damping remains stable even when a slow frame exceeds 100 ms. */
export function materialTransitionAlpha(delta: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1
  // Exponential interpolation never overshoots, so capping elapsed time would
  // only stretch the transition on slow devices and delay the exported color.
  return 1 - Math.exp(-Math.max(0, delta) * 14)
}
