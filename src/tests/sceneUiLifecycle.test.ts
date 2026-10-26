import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../stores/uiStore'

const state = () => useUiStore.getState()
const reset = () => useUiStore.setState(useUiStore.getInitialState(), true)

beforeEach(reset)
afterEach(reset)

describe('scene-dependent UI lifecycle', () => {
  it('does not enqueue an export before the scene is ready or while it is busy', () => {
    state().requestScreenshot()
    expect(state().screenshotRequested).toBe(0)
    state().setSceneReady(true)
    state().requestScreenshot()
    expect(state().screenshotRequested).toBe(1)
    state().setScreenshotBusy(true)
    state().requestScreenshot()
    expect(state().screenshotRequested).toBe(1)
  })

  it('clears hover and an export lock when the renderer becomes unavailable', () => {
    state().setSceneReady(true)
    state().setHoveredPart('body')
    state().setScreenshotBusy(true)
    state().setSceneReady(false)
    expect(state().sceneReady).toBe(false)
    expect(state().hoveredPart).toBeNull()
    expect(state().screenshotBusy).toBe(false)
    state().requestScreenshot()
    expect(state().screenshotRequested).toBe(0)
  })

  it('retains camera and export preferences and accepts an export after recovery', () => {
    state().setCameraView('top')
    state().setScreenshotSize('2048')
    state().setQuality('low')
    state().setSceneReady(true)
    state().setHoveredPart('sole')
    state().setScreenshotBusy(true)
    state().setSceneReady(false)
    state().setSceneReady(true)
    expect(state().cameraView).toBe('top')
    expect(state().screenshotSize).toBe('2048')
    expect(state().quality).toBe('low')
    expect(state().hoveredPart).toBeNull()
    state().requestScreenshot()
    expect(state().screenshotRequested).toBe(1)
  })
})
