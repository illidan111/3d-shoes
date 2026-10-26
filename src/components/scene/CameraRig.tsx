import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three'
import { getPart, isPartId, type PartId } from '../../config/parts'
import { getCameraView } from '../../config/views'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'

export function CameraRig() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const selectedPart = useConfigStore((state) => state.selectedPart)
  const viewRevision = useUiStore((state) => state.viewRevision)
  const reducedMotion = useReducedMotion()
  const { camera, scene, size, gl } = useThree()
  const flight = useRef(false)
  const previousRevision = useRef(viewRevision)
  const previousPart = useRef<PartId | null>(null)
  const scratch = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      direction: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
      corner: new Vector3(),
      bounds: new Box3(),
      meshes: [] as Mesh[],
    }),
    [],
  )

  useEffect(() => {
    const firstFrame = previousPart.current === null
    const viewRequested = previousRevision.current !== viewRevision
    const partChanged = previousPart.current !== selectedPart
    previousRevision.current = viewRevision
    previousPart.current = selectedPart
    const requestedView = useUiStore.getState().cameraView
    // On mount the store already holds the latest UI intent, including commands
    // issued before the GLB finished loading. Only later part changes override it.
    const focusPart = firstFrame
      ? requestedView === null
      : partChanged && (!viewRequested || requestedView === null)
    // A part chosen after a named view in the same batch clears requestedView;
    // its focus still wins even though that earlier view changed the revision.
    if (focusPart) useUiStore.getState().clearCameraView()
    const viewId = useUiStore.getState().cameraView

    // Resizing must not silently replace a user's free orbit.
    if (!viewId && !focusPart && !firstFrame) {
      if (reducedMotion && flight.current && controls.current) {
        camera.position.copy(scratch.position)
        controls.current.target.copy(scratch.target)
        controls.current.update()
        flight.current = false
      }
      return
    }

    const aspect = size.width / Math.max(size.height, 1)
    let distance: number
    if (viewId) {
      const view = getCameraView(viewId)
      scratch.bounds.makeEmpty()
      scratch.meshes.length = 0
      scene.updateMatrixWorld(true)
      scene.traverse((object) => {
        // Exclude the contact-shadow plane from the product bounds.
        if (object instanceof Mesh && isPartId(object.userData.part)) {
          scratch.bounds.expandByObject(object)
          scratch.meshes.push(object)
        }
      })
      if (scratch.bounds.isEmpty()) {
        scratch.bounds.min.set(-1.825, -0.83, -0.75)
        scratch.bounds.max.set(1.825, 0.75, 0.75)
      }
      scratch.bounds.getCenter(scratch.target)
      scratch.target.x += view.targetOffset[0]
      scratch.target.y += view.targetOffset[1]
      scratch.target.z += view.targetOffset[2]
      scratch.direction.set(view.direction[0], view.direction[1], view.direction[2]).normalize()
      scratch.right.crossVectors(camera.up, scratch.direction).normalize()
      scratch.up.crossVectors(scratch.direction, scratch.right).normalize()
      const verticalTangent = Math.tan(
        ((camera instanceof PerspectiveCamera ? camera.fov : 32) * Math.PI) / 360,
      )
      const horizontalTangent = verticalTangent * aspect
      const horizontalSlope = horizontalTangent / 1.1
      const verticalSlope = verticalTangent / 1.1
      let horizontalMax = -Infinity
      let horizontalMin = Infinity
      let verticalMax = -Infinity
      let verticalMin = Infinity
      // For each vertex, |x - targetX| <= slope * (distance - depth).
      // Intersect these intervals to solve both the closest fitting distance
      // and the centered target. This avoids empty AABB corners and balances
      // the perspective silhouette with a 10% margin. Only runs on view/resize.
      for (const mesh of scratch.meshes) {
        const positions = mesh.geometry.getAttribute('position')
        if (!positions) continue
        for (let index = 0; index < positions.count; index += 1) {
          scratch.corner
            .fromBufferAttribute(positions, index)
            .applyMatrix4(mesh.matrixWorld)
            .sub(scratch.target)
          const depth = scratch.corner.dot(scratch.direction)
          const horizontal = scratch.corner.dot(scratch.right)
          const vertical = scratch.corner.dot(scratch.up)
          horizontalMax = Math.max(horizontalMax, horizontal + horizontalSlope * depth)
          horizontalMin = Math.min(horizontalMin, horizontal - horizontalSlope * depth)
          verticalMax = Math.max(verticalMax, vertical + verticalSlope * depth)
          verticalMin = Math.min(verticalMin, vertical - verticalSlope * depth)
        }
      }
      if (Number.isFinite(horizontalMax)) {
        distance = Math.max(
          3.2,
          (horizontalMax - horizontalMin) / (2 * horizontalSlope),
          (verticalMax - verticalMin) / (2 * verticalSlope),
        )
        scratch.target.addScaledVector(scratch.right, (horizontalMax + horizontalMin) / 2)
        scratch.target.addScaledVector(scratch.up, (verticalMax + verticalMin) / 2)
      } else distance = 5.3
    } else {
      const focus = selectedPart === 'body' ? [0, -0.02, 0] : getPart(selectedPart).focus
      scratch.target.set(focus[0] ?? 0, focus[1] ?? 0, focus[2] ?? 0)
      scratch.direction.set(-3, 2.1, 6).normalize()
      distance = Math.max(5.3, 3.3 / (2 * Math.tan((32 * Math.PI) / 360) * aspect))
      if (selectedPart !== 'body') distance *= 0.85
    }
    scratch.position.copy(scratch.direction).multiplyScalar(distance).add(scratch.target)
    if (controls.current) controls.current.maxDistance = Math.max(9.6, distance * 1.15)
    flight.current = true
    if (reducedMotion && controls.current) {
      camera.position.copy(scratch.position)
      controls.current.target.copy(scratch.target)
      controls.current.update()
      flight.current = false
    }
  }, [camera, reducedMotion, scene, scratch, selectedPart, size.height, size.width, viewRevision])

  useEffect(() => {
    gl.domElement.style.touchAction = 'pan-y'
  }, [gl])

  useFrame((_, delta) => {
    if (!flight.current || !controls.current) return
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 7)
    camera.position.lerp(scratch.position, alpha)
    controls.current.target.lerp(scratch.target, alpha)
    if (
      camera.position.distanceToSquared(scratch.position) < 0.00001 &&
      controls.current.target.distanceToSquared(scratch.target) < 0.00001
    ) {
      camera.position.copy(scratch.position)
      controls.current.target.copy(scratch.target)
      flight.current = false
    }
    controls.current.update()
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
      minPolarAngle={0.025}
      maxPolarAngle={Math.PI / 2.08}
      rotateSpeed={0.7}
      zoomSpeed={0.65}
      onStart={() => {
        flight.current = false
        useUiStore.getState().clearCameraView()
      }}
    />
  )
}
