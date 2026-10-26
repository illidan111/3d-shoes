import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { getPart } from '../../config/parts'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'

export function CameraRig() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const selectedPart = useConfigStore((state) => state.selectedPart)
  const viewRevision = useUiStore((state) => state.viewRevision)
  const reducedMotion = useReducedMotion()
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  const flight = useRef(false)
  const previousRevision = useRef(viewRevision)
  const destination = useMemo(() => ({ position: new Vector3(), target: new Vector3() }), [])

  useEffect(() => {
    const isReset = previousRevision.current !== viewRevision
    previousRevision.current = viewRevision
    const focus = isReset || selectedPart === 'body' ? [0, -0.02, 0] : getPart(selectedPart).focus
    destination.target.set(focus[0] ?? 0, focus[1] ?? 0, focus[2] ?? 0)
    // Increase distance on portrait canvases so the full shoe remains in view.
    const aspect = size.width / Math.max(size.height, 1)
    const distance = Math.max(5.3, 3.3 / (2 * Math.tan((32 * Math.PI) / 360) * aspect))
    const closeup = isReset || selectedPart === 'body' ? 1 : 0.85
    destination.position
      .set(-3, 2.1, 6)
      .normalize()
      .multiplyScalar(Math.min(9, distance) * closeup)
      .add(destination.target)
    flight.current = true
    if (reducedMotion && controls.current) {
      camera.position.copy(destination.position)
      controls.current.target.copy(destination.target)
      controls.current.update()
      flight.current = false
    }
  }, [camera, destination, reducedMotion, selectedPart, size.height, size.width, viewRevision])

  useEffect(() => {
    // OrbitControls sets touch-action:none when connecting. Restore native
    // vertical scrolling; a horizontal one-finger drag still rotates the shoe.
    gl.domElement.style.touchAction = 'pan-y'
  }, [gl])

  useFrame((_, delta) => {
    if (!flight.current || !controls.current) return
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 7)
    camera.position.lerp(destination.position, alpha)
    controls.current.target.lerp(destination.target, alpha)
    controls.current.update()
    if (camera.position.distanceToSquared(destination.position) < 0.00001) flight.current = false
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.09}
      minDistance={2.8}
      maxDistance={9.6}
      minPolarAngle={Math.PI / 7}
      maxPolarAngle={Math.PI / 2.08}
      rotateSpeed={0.7}
      zoomSpeed={0.65}
      onStart={() => {
        flight.current = false
      }}
    />
  )
}
