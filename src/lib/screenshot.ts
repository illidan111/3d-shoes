import { Vector2, Vector4, type Camera, type Scene, type WebGLRenderer } from 'three'

export type ScreenshotSize = 'viewport' | '2048'

export function getScreenshotDimensions(width: number, height: number, size: ScreenshotSize) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new RangeError('Размер изображения должен быть положительным.')
  const scale = size === '2048' ? 2048 / Math.max(width, height) : 1
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Copy pixels synchronously; encode after restoring the live canvas. */
export function captureScreenshot(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  size: ScreenshotSize = 'viewport',
): Promise<Blob> {
  if (renderer.getContext().isContextLost()) throw new Error('3D-контекст недоступен.')
  const dimensions = getScreenshotDimensions(
    renderer.domElement.width,
    renderer.domElement.height,
    size,
  )
  const output = document.createElement('canvas')
  output.width = dimensions.width
  output.height = dimensions.height
  const context = output.getContext('2d')
  if (!context) throw new Error('Браузер не смог подготовить изображение.')
  const previous = {
    size: renderer.getSize(new Vector2()),
    pixelRatio: renderer.getPixelRatio(),
    viewport: renderer.getViewport(new Vector4()),
    scissor: renderer.getScissor(new Vector4()),
    scissorTest: renderer.getScissorTest(),
    target: renderer.getRenderTarget(),
    cubeFace: renderer.getActiveCubeFace(),
    mipLevel: renderer.getActiveMipmapLevel(),
  }
  const resized = size === '2048'
  try {
    renderer.setRenderTarget(null)
    if (resized) {
      renderer.setPixelRatio(1)
      // false leaves CSS dimensions and R3F's resize observer untouched.
      renderer.setSize(dimensions.width, dimensions.height, false)
      renderer.setViewport(0, 0, dimensions.width, dimensions.height)
      renderer.setScissorTest(false)
    }
    // The default framebuffer retains the preview's tone mapping and gamma.
    // Ordinary render targets bypass display tone mapping in Three r186.
    renderer.render(scene, camera)
    if (renderer.getContext().isContextLost()) throw new Error('3D-контекст был прерван.')
    context.drawImage(renderer.domElement, 0, 0)
  } finally {
    // No await before restoration: the browser cannot paint the temporary size.
    if (resized) {
      renderer.setSize(previous.size.x, previous.size.y, false)
      renderer.setPixelRatio(previous.pixelRatio)
    }
    renderer.setViewport(previous.viewport)
    renderer.setScissor(previous.scissor)
    renderer.setScissorTest(previous.scissorTest)
    renderer.setRenderTarget(previous.target, previous.cubeFace, previous.mipLevel)
    if (resized && previous.target === null && !renderer.getContext().isContextLost())
      renderer.render(scene, camera)
    // Camera projection/aspect, exposure, clear color and CSS never change.
  }
  return new Promise<Blob>((resolve, reject) => {
    output.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Браузер не смог создать PNG.'))
    }, 'image/png')
  })
}

const exportQueues = new WeakMap<WebGLRenderer, Promise<void>>()

/** Serialize exports per renderer; a rejection cannot poison the next export. */
export function downloadScreenshot(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  key: string,
  size: ScreenshotSize = 'viewport',
): Promise<void> {
  const preceding = exportQueues.get(renderer) ?? Promise.resolve()
  const result = preceding
    .catch(() => undefined)
    .then(async () => {
      const blob = await captureScreenshot(renderer, scene, camera, size)
      const url = URL.createObjectURL(blob)
      try {
        const link = document.createElement('a')
        link.href = url
        const suffix = size === '2048' ? '-2048' : ''
        link.download = `forma-${key.replace(/[^a-z0-9_-]/gi, '-').slice(0, 180)}${suffix}.png`
        document.body.append(link)
        try {
          link.click()
        } finally {
          link.remove()
        }
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
    })
  exportQueues.set(renderer, result)
  const clearQueue = () => {
    if (exportQueues.get(renderer) === result) exportQueues.delete(renderer)
  }
  void result.then(clearQueue, clearQueue)
  return result
}
