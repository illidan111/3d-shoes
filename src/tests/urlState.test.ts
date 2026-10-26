import { describe, expect, it } from 'vitest'
import { cloneConfig, DEFAULT_CONFIG } from '../config/parts'
import { configurationKey, parseConfig, serializeConfig, updateConfigUrl } from '../lib/urlState'

describe('shareable URL configuration', () => {
  it('uses defaults for an empty query', () => {
    expect(parseConfig('')).toEqual(DEFAULT_CONFIG)
    expect(parseConfig('?')).toEqual(DEFAULT_CONFIG)
  })

  it('loads a valid material and color while keeping missing parts defaulted', () => {
    const config = parseConfig('?body=olive-metallic&lace=navy-glossy')
    expect(config.body).toEqual({ color: 'olive', material: 'metallic' })
    expect(config.lace).toEqual({ color: 'navy', material: 'glossy' })
    expect(config.sole).toEqual(DEFAULT_CONFIG.sole)
  })

  it('ignores unknown keys and rejects unsupported values', () => {
    expect(parseConfig('?unknown=red-matte&body=purple-metallic&sole=black-plastic')).toEqual(
      DEFAULT_CONFIG,
    )
  })

  it('rejects malformed, extra-segment, and incomplete values', () => {
    expect(parseConfig('?body=red&sole=black-matte-extra&lace=-matte&tongue=')).toEqual(
      DEFAULT_CONFIG,
    )
  })

  it('safely handles URL encoded special characters', () => {
    expect(parseConfig('?body=%3Cscript%3E-matte&sole=%E0%A4%A')).toEqual(DEFAULT_CONFIG)
  })

  it('round-trips the entire configuration deterministically', () => {
    const config = cloneConfig(DEFAULT_CONFIG)
    config.body = { color: 'red', material: 'metallic' }
    config.tongue = { color: 'rose', material: 'glossy' }
    expect(parseConfig(serializeConfig(config))).toEqual(config)
    expect(serializeConfig(config)).toBe(
      'body=red-metallic&sole=white-matte&lace=white-matte&tongue=rose-glossy',
    )
  })

  it('produces a stable key regardless of query order or unrelated parameters', () => {
    const first = parseConfig('?body=navy-glossy&sole=black-matte')
    const second = parseConfig('?campaign=hello&sole=black-matte&body=navy-glossy')
    expect(configurationKey(first)).toBe(configurationKey(second))
  })

  it('returns fresh defaults for each parse', () => {
    const config = parseConfig('')
    config.body.color = 'red'
    expect(parseConfig('').body.color).toBe('blue')
  })

  it('preserves unrelated URL parameters, path, hash, and history state', () => {
    window.history.replaceState({ route: 'studio' }, '', '/studio?campaign=launch#customize')
    updateConfigUrl(DEFAULT_CONFIG)
    expect(window.location.pathname).toBe('/studio')
    expect(window.location.hash).toBe('#customize')
    expect(new URLSearchParams(window.location.search).get('campaign')).toBe('launch')
    expect(parseConfig(window.location.search)).toEqual(DEFAULT_CONFIG)
    expect(window.history.state).toEqual({ route: 'studio' })
  })
})
