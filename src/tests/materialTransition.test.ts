import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { materialTransitionAlpha } from '../lib/materialTransition'

function transitionAcrossFrames(frameCount: number, elapsed: number) {
  const color = new Color('#71869f')
  const target = new Color('#702c39')
  let roughness = 0.82
  for (let frame = 0; frame < frameCount; frame += 1) {
    const alpha = materialTransitionAlpha(elapsed / frameCount, false)
    color.lerp(target, alpha)
    roughness += (0.22 - roughness) * alpha
  }
  return { color, roughness }
}

describe('material transition timing', () => {
  it('reaches the same color and finish after 400 ms at low and high frame rates', () => {
    const slowFrame = transitionAcrossFrames(1, 0.4)
    for (const frameCount of [4, 24]) {
      const result = transitionAcrossFrames(frameCount, 0.4)
      expect(result.color.r).toBeCloseTo(slowFrame.color.r, 10)
      expect(result.color.g).toBeCloseTo(slowFrame.color.g, 10)
      expect(result.color.b).toBeCloseTo(slowFrame.color.b, 10)
      expect(result.roughness).toBeCloseTo(slowFrame.roughness, 10)
    }
    // The export waits 400 ms: the finish must then be within 1% of its target,
    // including when the renderer only managed one frame during that period.
    expect(Math.abs(slowFrame.roughness - 0.22)).toBeLessThan((0.82 - 0.22) * 0.01)
  })

  it('finishes instantly with reduced motion, even before time has advanced', () => {
    expect(materialTransitionAlpha(0, true)).toBe(1)
    expect(materialTransitionAlpha(1 / 60, true)).toBe(1)
  })

  it('does not move backward for a nonpositive clock delta or overshoot after a long pause', () => {
    expect(materialTransitionAlpha(0, false)).toBe(0)
    expect(materialTransitionAlpha(-0.1, false)).toBe(0)
    expect(materialTransitionAlpha(30, false)).toBeLessThanOrEqual(1)
    expect(materialTransitionAlpha(30, false)).toBeGreaterThan(0.99)
  })
})
