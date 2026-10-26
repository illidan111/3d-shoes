import { beforeEach, describe, expect, it } from 'vitest'
import {
  cloneConfig,
  DEFAULT_CONFIG,
  type ColorId,
  type PartConfig,
  type PartId,
} from '../config/parts'
import { HISTORY_LIMIT, useConfigStore } from '../stores/configStore'

const state = () => useConfigStore.getState()

beforeEach(() => {
  state().loadConfig(DEFAULT_CONFIG)
  state().selectPart('body')
})

describe('configuration history', () => {
  it('starts with independent default configuration objects', () => {
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().config.body).not.toBe(DEFAULT_CONFIG.body)
  })

  it('coalesces quick edits to the same part into a single undo', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { color: 'olive' }, 1300)
    state().updatePart('body', { material: 'glossy' }, 1600)
    expect(state().past).toHaveLength(1)
    state().undo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    state().redo()
    expect(state().config.body).toEqual({ color: 'olive', material: 'glossy' })
  })

  it('opens a history entry after the coalescing window', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { color: 'olive' }, 1401)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body.color).toBe('red')
  })

  it('separates edits to different parts', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('sole', { color: 'black' }, 1100)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body.color).toBe('red')
    expect(state().config.sole.color).toBe('white')
  })

  it('ends a coalesced edit when selection leaves and returns to the same part', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().selectPart('sole')
    state().selectPart('body')
    state().updatePart('body', { material: 'metallic' }, 1100)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body).toEqual({ color: 'red', material: 'matte' })
  })

  it('ends a coalesced edit after undo and redo', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().undo()
    state().redo()
    state().updatePart('body', { material: 'metallic' }, 1100)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body).toEqual({ color: 'red', material: 'matte' })
  })

  it('does not record a no-op or discard redo for one', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().undo()
    state().updatePart('body', { color: 'blue' }, 1100)
    expect(state().past).toHaveLength(0)
    expect(state().future).toHaveLength(1)
  })

  it('discards redo when editing a previously undone configuration', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { color: 'olive' }, 2000)
    state().undo()
    state().updatePart('body', { color: 'navy' }, 2100)
    expect(state().future).toHaveLength(0)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body.color).toBe('red')
  })

  it('caps history at fifty entries', () => {
    for (let index = 0; index < 70; index++) {
      state().updatePart('body', { color: index % 2 === 0 ? 'red' : 'olive' }, index * 1000)
    }
    expect(state().past).toHaveLength(HISTORY_LIMIT)
  })

  it('makes reset undoable and ends the active edit group', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().resetConfig()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    state().undo()
    expect(state().config.body.color).toBe('red')
    expect(state().editGroup).toBeNull()
  })

  it('loads a configuration without retaining previous history', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    const config = cloneConfig(DEFAULT_CONFIG)
    config.sole.material = 'metallic'
    state().loadConfig(config)
    expect(state().config).toEqual(config)
    expect(state().past).toHaveLength(0)
    config.sole.color = 'black'
    expect(state().config.sole.color).toBe('white')
  })

  it('ignores invalid values without throwing or polluting history', () => {
    expect(() => {
      state().selectPart('__proto__' as PartId)
      state().updatePart('invalid' as PartId, { color: 'red' })
      state().updatePart('body', { color: 'invalid' as ColorId })
      state().updatePart('body', null as unknown as Partial<PartConfig>)
      state().loadConfig({ body: { color: 'red', material: 'matte' } })
      state().loadConfig(null)
    }).not.toThrow()
    expect(state().selectedPart).toBe('body')
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().past).toHaveLength(0)
  })

  it('handles undo and redo at history boundaries', () => {
    state().undo()
    state().redo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().past).toHaveLength(0)
    expect(state().future).toHaveLength(0)
  })
})
