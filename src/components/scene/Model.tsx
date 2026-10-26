import { useEffect, useMemo } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { FLOOR_Y, MODEL_SIZE, MODEL_URL } from '../../config/model'
import { getColor, getMaterial, PARTS, type PartId } from '../../config/parts'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { attachHoverRim, type RimUniform } from '../../shaders/hoverRim'

interface AnimatedMaterial {
  material: MeshStandardMaterial
  part: PartId
  shade: number
  color: Color
  roughness: number
  metalness: number
  rim: RimUniform
}

function findPart(mesh: Mesh): PartId | undefined {
  const declared: unknown = mesh.userData.part
  const explicit = PARTS.find((part) => part.id === declared)
  if (explicit) return explicit.id
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const names = [mesh.name, ...materials.map((material) => material.name)]
  return PARTS.find((part) =>
    part.meshNames.some((name) =>
      names.some((candidate) => candidate === name || candidate.startsWith(`${name}_`)),
    ),
  )?.id
}

export function Model() {
  const { scene } = useGLTF(MODEL_URL)
  const config = useConfigStore((state) => state.config)
  const reducedMotion = useReducedMotion()

  // Clone only once per GLB. Geometries/textures remain cached; each mutable
  // material is owned by this instance, so presets never alter the loader cache.
  const model = useMemo(() => {
    const object = scene.clone(true)
    const animated: AnimatedMaterial[] = []
    const owned: MeshStandardMaterial[] = []

    object.traverse((node) => {
      if (!(node instanceof Mesh)) return
      const part = findPart(node)
      if (!part) return
      node.userData.part = part
      const originals = Array.isArray(node.material) ? node.material : [node.material]
      const materials = originals.map((original) => {
        const material =
          original instanceof MeshStandardMaterial ? original.clone() : new MeshStandardMaterial()
        const shadeValue: unknown = original.userData.shade
        const shade = typeof shadeValue === 'number' ? Math.min(1.5, Math.max(0.2, shadeValue)) : 1
        const initial = useConfigStore.getState().config[part]
        const finish = getMaterial(initial.material)
        const color = new Color(getColor(initial.color).hex).multiplyScalar(shade)
        material.color.copy(color)
        material.roughness = finish.roughness
        material.metalness = finish.metalness
        material.envMapIntensity = 0.85
        const rim = attachHoverRim(material)
        animated.push({
          material,
          part,
          shade,
          color,
          roughness: finish.roughness,
          metalness: finish.metalness,
          rim,
        })
        owned.push(material)
        return material
      })
      node.material = Array.isArray(node.material) ? materials : (materials[0] ?? node.material)
    })

    const box = new Box3().setFromObject(object)
    const dimensions = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const scale = MODEL_SIZE / Math.max(dimensions.x, dimensions.y, dimensions.z, 0.001)
    const position: [number, number, number] = [
      -center.x * scale,
      FLOOR_Y - box.min.y * scale,
      -center.z * scale,
    ]
    return { object, animated, owned, scale, position }
  }, [scene])

  useEffect(() => {
    for (const entry of model.animated) {
      const next = config[entry.part]
      const finish = getMaterial(next.material)
      entry.color.set(getColor(next.color).hex).multiplyScalar(entry.shade)
      entry.roughness = finish.roughness
      entry.metalness = finish.metalness
    }
  }, [config, model])

  useEffect(() => () => model.owned.forEach((material) => material.dispose()), [model])

  useFrame((_, delta) => {
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 14)
    const hovered = useUiStore.getState().hoveredPart
    for (const entry of model.animated) {
      entry.material.color.lerp(entry.color, alpha)
      entry.material.roughness += (entry.roughness - entry.material.roughness) * alpha
      entry.material.metalness += (entry.metalness - entry.material.metalness) * alpha
      const rim = hovered === entry.part ? 0.65 : 0
      entry.rim.value += (rim - entry.rim.value) * alpha
    }
  })

  const partFromEvent = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    const id: unknown = event.object.userData.part
    return PARTS.find((part) => part.id === id)?.id
  }

  return (
    <group position={model.position} scale={model.scale} dispose={null}>
      <primitive
        object={model.object}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          const part = partFromEvent(event)
          if (!part) return
          event.stopPropagation()
          useUiStore.getState().setHoveredPart(part)
        }}
        onPointerOut={() => useUiStore.getState().setHoveredPart(null)}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.delta > 4) return
          const part = partFromEvent(event)
          if (!part) return
          event.stopPropagation()
          useConfigStore.getState().selectPart(part)
        }}
      />
    </group>
  )
}
