import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { downloadScreenshot } from '../../lib/screenshot'
import { configurationKey } from '../../lib/urlState'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'

interface SceneRuntimeProps {
  onContextLost: () => void
}

/** Crosses the renderer/DOM boundary through events and stores only. */
export function SceneRuntime({ onContextLost }: SceneRuntimeProps) {
  const { gl, scene, camera } = useThree()
  const request = useUiStore((state) => state.screenshotRequested)
  const handledRequest = useRef(request)
  const hovered = useUiStore((state) => state.hoveredPart)
  const frames = useRef({ count: 0, elapsed: 0 })
  const [preparationError, setPreparationError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    // Environment installs its texture in a layout effect before this effect.
    // With frameloop="never", no render can synchronously wait for the PBR
    // programs while KHR_parallel_shader_compile prepares them on the GPU.
    void gl
      .compileAsync(scene, camera)
      .then(() => {
        if (cancelled) return
        useUiStore.getState().setSceneReady(true)
        useUiStore.getState().announce('3D-модель готова. Выберите деталь или вращайте кроссовок.')
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setPreparationError(
            error instanceof Error ? error : new Error('Не удалось подготовить 3D.'),
          )
      })
    return () => {
      cancelled = true
      useUiStore.getState().setSceneReady(false)
    }
  }, [camera, gl, scene])

  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'grab'
  }, [gl, hovered])

  useEffect(() => {
    const canvas = gl.domElement
    const handleLoss = (event: Event) => {
      event.preventDefault()
      useUiStore.getState().setSceneReady(false)
      useUiStore.getState().announce('3D-контекст прерван. Нажмите «Восстановить 3D».')
      onContextLost()
    }
    canvas.addEventListener('webglcontextlost', handleLoss)
    return () => canvas.removeEventListener('webglcontextlost', handleLoss)
  }, [gl, onContextLost])

  useEffect(() => {
    if (request === handledRequest.current) return
    handledRequest.current = request
    let cancelled = false
    let frame = 0
    let latestConfig = useConfigStore.getState().config
    let stableSince = performance.now()

    const captureWhenSettled = (now: number) => {
      if (cancelled) return
      const nextConfig = useConfigStore.getState().config
      if (latestConfig !== nextConfig) {
        latestConfig = nextConfig
        stableSince = now
      }
      // Wait for the 300 ms material transition, including edits made directly
      // after the export click. No perpetual preserveDrawingBuffer allocation.
      if (now - stableSince < 400) {
        frame = requestAnimationFrame(captureWhenSettled)
        return
      }
      void downloadScreenshot(gl, scene, camera, configurationKey(latestConfig))
        .then(() => {
          if (!cancelled)
            useUiStore.getState().announce('PNG сохранён. Имя файла содержит ключ конфигурации.')
        })
        .catch(() => {
          if (!cancelled)
            useUiStore.getState().announce('Не удалось сохранить PNG. Попробуйте ещё раз.')
        })
    }
    frame = requestAnimationFrame(captureWhenSettled)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [camera, gl, request, scene])

  useFrame((_, delta) => {
    if (document.visibilityState !== 'visible') {
      frames.current.count = 0
      frames.current.elapsed = 0
      return
    }
    frames.current.count += 1
    frames.current.elapsed += delta
    if (frames.current.elapsed < 1) return
    const detail = {
      fps: Math.round(frames.current.count / frames.current.elapsed),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      dpr: gl.getPixelRatio(),
      quality: useUiStore.getState().quality,
    }
    // Consumers can inspect performance without subscribing React to frames.
    window.dispatchEvent(new CustomEvent('forma:metrics', { detail }))
    frames.current.count = 0
    frames.current.elapsed = 0
  })

  if (preparationError) throw preparationError
  return null
}
