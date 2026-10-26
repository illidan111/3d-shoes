import type { ShoeConfig } from './parts'

export interface ShoePreset {
  id: string
  name: string
  description: string
  config: ShoeConfig
}

/** Stable IDs can identify a preset; the actual configuration stays portable. */
export const PRESETS = [
  {
    id: 'monochrome',
    name: 'Монохром',
    description: 'Молочный силуэт, графитовые детали',
    config: {
      body: { color: 'white', material: 'matte' },
      sole: { color: 'white', material: 'matte' },
      lace: { color: 'black', material: 'matte' },
      tongue: { color: 'black', material: 'matte' },
    } satisfies ShoeConfig,
  },
  {
    id: 'sand',
    name: 'Песок',
    description: 'Тёплые оттенки и оливковый акцент',
    config: {
      body: { color: 'sand', material: 'matte' },
      sole: { color: 'white', material: 'matte' },
      lace: { color: 'sand', material: 'matte' },
      tongue: { color: 'olive', material: 'matte' },
    } satisfies ShoeConfig,
  },
  {
    id: 'night',
    name: 'Ночной город',
    description: 'Глубокий синий и серебряные блики',
    config: {
      body: { color: 'navy', material: 'glossy' },
      sole: { color: 'black', material: 'matte' },
      lace: { color: 'silver', material: 'metallic' },
      tongue: { color: 'black', material: 'matte' },
    } satisfies ShoeConfig,
  },
  {
    id: 'accent',
    name: 'Акцент',
    description: 'Бордовый корпус с контрастными шнурками',
    config: {
      body: { color: 'red', material: 'matte' },
      sole: { color: 'white', material: 'matte' },
      lace: { color: 'blue', material: 'glossy' },
      tongue: { color: 'rose', material: 'matte' },
    } satisfies ShoeConfig,
  },
] as const satisfies readonly ShoePreset[]

export type PresetId = (typeof PRESETS)[number]['id']
