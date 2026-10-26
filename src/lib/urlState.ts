import {
  cloneConfig,
  DEFAULT_CONFIG,
  isColorId,
  isMaterialId,
  isShoeConfig,
  PARTS,
  type ShoeConfig,
} from '../config/parts'

/** Invalid, missing, and unknown fields have deterministic defaults. */
export function parseConfig(search: string): ShoeConfig {
  const config = cloneConfig(DEFAULT_CONFIG)
  if (typeof search !== 'string') return config
  const params = new URLSearchParams(search)
  for (const { id } of PARTS) {
    const value = params.get(id)
    if (!value) continue
    const pieces = value.split('-')
    const [color, material] = pieces
    if (pieces.length === 2 && isColorId(color) && isMaterialId(material)) {
      config[id] = { color, material }
    }
  }
  return config
}

/** Stable ordering makes equivalent configurations produce the same share link. */
export function serializeConfig(config: ShoeConfig): string {
  const safeConfig = isShoeConfig(config) ? config : DEFAULT_CONFIG
  const params = new URLSearchParams()
  for (const { id } of PARTS) params.set(id, `${safeConfig[id].color}-${safeConfig[id].material}`)
  return params.toString()
}

export function configurationKey(config: ShoeConfig): string {
  return serializeConfig(config)
}

/** Preserve campaign parameters, the current route, and the anchor. */
export function updateConfigUrl(config: ShoeConfig): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const configParams = new URLSearchParams(serializeConfig(config))
  for (const [key, value] of configParams) url.searchParams.set(key, value)
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
}
