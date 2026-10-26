import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Scene, Vector2, Vector4, type WebGLRenderer } from 'three'
import { captureScreenshot, getScreenshotDimensions } from '../lib/screenshot'

describe('export dimensions', () => {
  it('keeps the drawing-buffer size for viewport exports', () => {
    expect(getScreenshotDimensions(1600, 1000, 'viewport')).toEqual({ width: 1600, height: 1000 })
  })
  it('fits landscape, portrait and square exports to an exact 2048px long edge', () => {
    expect(getScreenshotDimensions(800, 500, '2048')).toEqual({ width: 2048, height: 1280 })
    expect(getScreenshotDimensions(500, 800, '2048')).toEqual({ width: 1280, height: 2048 })
    expect(getScreenshotDimensions(900, 900, '2048')).toEqual({ width: 2048, height: 2048 })
  })
  it('rounds the short edge without producing zero pixels', () => {
    expect(getScreenshotDimensions(10000, 1, '2048')).toEqual({ width: 2048, height: 1 })
    expect(getScreenshotDimensions(300, 200, '2048')).toEqual({ width: 2048, height: 1365 })
  })
  it('rejects an unavailable or invalid drawing buffer', () => {
    for (const [width, height] of [
      [0, 20],
      [20, -1],
      [NaN, 10],
      [10, Infinity],
    ])
      expect(() => getScreenshotDimensions(width ?? 0, height ?? 0, '2048')).toThrow(RangeError)
  })
})

function rendererFixture() {
  const canvas = document.createElement('canvas')
  const state = {
    size: new Vector2(800, 500),
    ratio: 2,
    viewport: new Vector4(10, 20, 780, 460),
    scissor: new Vector4(2, 3, 600, 400),
    scissorTest: true,
  }
  const syncBuffer = () => {
    canvas.width = state.size.x * state.ratio
    canvas.height = state.size.y * state.ratio
  }
  syncBuffer()
  const render = vi.fn()
  const setSize = vi.fn((width: number, height: number) => {
    state.size.set(width, height)
    syncBuffer()
  })
  const renderer = {
    domElement: canvas,
    getContext: () => ({ isContextLost: () => false }),
    getSize: (target: Vector2) => target.copy(state.size),
    getPixelRatio: () => state.ratio,
    getViewport: (target: Vector4) => target.copy(state.viewport),
    getScissor: (target: Vector4) => target.copy(state.scissor),
    getScissorTest: () => state.scissorTest,
    getRenderTarget: () => null,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    setRenderTarget: vi.fn(),
    setPixelRatio: (value: number) => {
      state.ratio = value
      syncBuffer()
    },
    setSize,
    setViewport: (x: Vector4 | number, y = 0, width = 0, height = 0) => {
      if (x instanceof Vector4) state.viewport.copy(x)
      else state.viewport.set(x, y, width, height)
    },
    setScissor: (value: Vector4) => {
      state.scissor.copy(value)
    },
    setScissorTest: (value: boolean) => {
      state.scissorTest = value
    },
    render,
  } as unknown as WebGLRenderer
  const expectRestored = () => {
    expect(state.size.toArray()).toEqual([800, 500])
    expect(state.ratio).toBe(2)
    expect([canvas.width, canvas.height]).toEqual([1600, 1000])
    expect(state.viewport.toArray()).toEqual([10, 20, 780, 460])
    expect(state.scissor.toArray()).toEqual([2, 3, 600, 400])
    expect(state.scissorTest).toBe(true)
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(null, 0, 0)
  }
  return { renderer, render, setSize, expectRestored }
}

describe('export restoration', () => {
  const blob = new Blob(['png'], { type: 'image/png' })
  const drawImage = vi.fn()
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(blob))
  })
  afterEach(() => vi.restoreAllMocks())

  it('restores the renderer before PNG encoding and never changes the camera projection', async () => {
    const fixture = rendererFixture()
    const camera = new PerspectiveCamera(32, 1.6, 0.1, 60)
    const projection = camera.projectionMatrix.clone()
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      fixture.expectRestored()
      expect([this.width, this.height]).toEqual([2048, 1280])
      callback(blob)
    })
    expect(await captureScreenshot(fixture.renderer, new Scene(), camera, '2048')).toBe(blob)
    expect(fixture.render).toHaveBeenCalledTimes(2)
    expect(camera.aspect).toBe(1.6)
    expect(camera.projectionMatrix.equals(projection)).toBe(true)
  })

  it('restores size, DPR, viewport and scissor if rendering fails', () => {
    const fixture = rendererFixture()
    fixture.render.mockImplementationOnce(() => {
      throw new Error('GPU failure')
    })
    expect(() =>
      captureScreenshot(fixture.renderer, new Scene(), new PerspectiveCamera(), '2048'),
    ).toThrow('GPU failure')
    fixture.expectRestored()
  })

  it('leaves the renderer restored when PNG encoding fails', async () => {
    const fixture = rendererFixture()
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(null))
    await expect(
      captureScreenshot(fixture.renderer, new Scene(), new PerspectiveCamera(), '2048'),
    ).rejects.toThrow('PNG')
    fixture.expectRestored()
  })

  it('does not resize the renderer for a viewport export', async () => {
    const fixture = rendererFixture()
    await captureScreenshot(fixture.renderer, new Scene(), new PerspectiveCamera())
    expect(fixture.setSize).not.toHaveBeenCalled()
    fixture.expectRestored()
  })
})
