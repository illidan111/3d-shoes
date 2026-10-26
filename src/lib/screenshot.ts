import type { Camera, Scene, WebGLRenderer } from 'three'

/** An explicit render keeps preserveDrawingBuffer off during normal interaction. */
export async function downloadScreenshot(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  key: string,
): Promise<void> {
  renderer.render(scene, camera)
  // Call toBlob in the same task: the browser may clear the buffer after paint.
  const blob = await new Promise<Blob>((resolve, reject) => {
    renderer.domElement.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('Браузер не смог создать PNG.'))
    }, 'image/png')
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `forma-${key.replace(/[^a-z0-9_-]/gi, '-').slice(0, 180)}.png`
  document.body.append(link)
  link.click()
  link.remove()
  // A short delay lets browsers finish consuming the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
