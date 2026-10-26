export const COLORS = [
  { id: 'blue', label: 'Синий', hex: '#71869f' },
  { id: 'navy', label: 'Глубокий синий', hex: '#283447' },
  { id: 'olive', label: 'Оливковый', hex: '#656b50' },
  { id: 'red', label: 'Бордовый', hex: '#702c39' },
  { id: 'silver', label: 'Серебристый', hex: '#c1c1bd' },
  { id: 'black', label: 'Графитовый', hex: '#252727' },
  { id: 'white', label: 'Молочный', hex: '#eee9df' },
  { id: 'sand', label: 'Песочный', hex: '#d5bda0' },
  { id: 'rose', label: 'Пудровый', hex: '#e8b3b0' },
] as const

export const MATERIALS = [
  {
    id: 'matte',
    label: 'Матовый',
    roughness: 0.82,
    metalness: 0.03,
    description: 'Мягкий свет. Чистая фактура.',
  },
  {
    id: 'glossy',
    label: 'Глянец',
    roughness: 0.22,
    metalness: 0.08,
    description: 'Гладкая поверхность с яркими бликами',
  },
  {
    id: 'metallic',
    label: 'Металл',
    roughness: 0.32,
    metalness: 0.86,
    description: 'Выразительные металлические отражения',
  },
] as const

export type ColorId = (typeof COLORS)[number]['id']
export type MaterialId = (typeof MATERIALS)[number]['id']
export type PartId = 'body' | 'sole' | 'lace' | 'tongue'
export type PartConfig = { color: ColorId; material: MaterialId }
export type ShoeConfig = Record<PartId, PartConfig>
export type Configuration = ShoeConfig

export interface PartDefinition {
  id: PartId
  label: string
  meshNames: string[]
  defaultColor: ColorId
  defaultMaterial: MaterialId
  focus: [number, number, number]
}

export const PARTS: PartDefinition[] = [
  {
    id: 'body',
    label: 'Корпус',
    meshNames: ['body_knit', 'body_suede', 'body_stitch', 'body_trim', 'body_eyelet'],
    defaultColor: 'blue',
    defaultMaterial: 'matte',
    focus: [0, 0, 0],
  },
  {
    id: 'sole',
    label: 'Подошва',
    meshNames: ['sole_foam', 'sole_rubber', 'sole_grooves'],
    defaultColor: 'white',
    defaultMaterial: 'matte',
    focus: [0, -0.62, 0],
  },
  {
    id: 'lace',
    label: 'Шнурки',
    meshNames: ['lace_woven'],
    defaultColor: 'white',
    defaultMaterial: 'matte',
    focus: [-0.25, 0.5, 0],
  },
  {
    id: 'tongue',
    label: 'Язычок',
    meshNames: ['tongue_lining', 'tongue_padded'],
    defaultColor: 'black',
    defaultMaterial: 'matte',
    focus: [0.35, 0.65, 0],
  },
]

export const DEFAULT_CONFIG: ShoeConfig = {
  body: { color: 'blue', material: 'matte' },
  sole: { color: 'white', material: 'matte' },
  lace: { color: 'white', material: 'matte' },
  tongue: { color: 'black', material: 'matte' },
}

export function isPartId(value: unknown): value is PartId {
  return typeof value === 'string' && PARTS.some((part) => part.id === value)
}

export function isColorId(value: unknown): value is ColorId {
  return typeof value === 'string' && COLORS.some((color) => color.id === value)
}

export function isMaterialId(value: unknown): value is MaterialId {
  return typeof value === 'string' && MATERIALS.some((material) => material.id === value)
}

export function getPart(id: unknown): PartDefinition {
  return (
    PARTS.find((part) => part.id === id) ?? {
      id: 'body',
      label: 'Корпус',
      meshNames: [],
      defaultColor: 'blue',
      defaultMaterial: 'matte',
      focus: [0, 0.35, 0],
    }
  )
}

export function getColor(id: unknown): (typeof COLORS)[number] {
  return COLORS.find((color) => color.id === id) ?? COLORS[0]
}

export function getMaterial(id: unknown): (typeof MATERIALS)[number] {
  return MATERIALS.find((material) => material.id === id) ?? MATERIALS[0]
}

export function isPartConfig(value: unknown): value is PartConfig {
  if (typeof value !== 'object' || value === null) return false
  return (
    'color' in value &&
    isColorId(value.color) &&
    'material' in value &&
    isMaterialId(value.material)
  )
}

export function isShoeConfig(value: unknown): value is ShoeConfig {
  if (typeof value !== 'object' || value === null) return false
  return PARTS.every(({ id }) => id in value && isPartConfig(Reflect.get(value, id)))
}

export function cloneConfig(config: ShoeConfig): ShoeConfig {
  return {
    body: { ...config.body },
    sole: { ...config.sole },
    lace: { ...config.lace },
    tongue: { ...config.tongue },
  }
}

export function configsEqual(left: ShoeConfig, right: ShoeConfig): boolean {
  return PARTS.every(
    ({ id }) => left[id].color === right[id].color && left[id].material === right[id].material,
  )
}
