import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config/parts'
import { HISTORY_LIMIT, useConfigStore } from '../stores/configStore'

const state = () => useConfigStore.getState()

beforeEach(() => state().loadConfig(DEFAULT_CONFIG))

describe('history for reverted edit groups', () => {
  it('removes an empty undo step after a quick color round trip', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { color: 'blue' }, 1100)
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().past).toHaveLength(0)
    expect(state().future).toHaveLength(0)
    expect(state().editGroup).toBeNull()
    state().undo()
    expect(state().future).toHaveLength(0)
  })

  it('keeps earlier changes undoable after the latest group is reverted', () => {
    state().updatePart('sole', { color: 'black' }, 1000)
    state().updatePart('body', { color: 'red' }, 2000)
    state().updatePart('body', { color: 'blue' }, 2100)
    expect(state().past).toHaveLength(1)
    expect(state().config.sole.color).toBe('black')
    state().undo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    state().redo()
    expect(state().config.sole.color).toBe('black')
  })

  it('retains distinct history entries when the return happens after the group window', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { color: 'blue' }, 2000)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body.color).toBe('red')
  })

  it('starts a fresh undo step for an edit immediately after a reverted group', () => {
    state().updatePart('sole', { color: 'black' }, 1000)
    state().updatePart('body', { color: 'red' }, 1100)
    state().updatePart('body', { color: 'blue' }, 1200)
    state().updatePart('body', { color: 'olive' }, 1300)
    expect(state().past).toHaveLength(2)
    state().undo()
    expect(state().config.body.color).toBe('blue')
    expect(state().config.sole.color).toBe('black')
  })

  it('compares the whole part when colors and materials change within one group', () => {
    state().updatePart('body', { color: 'red' }, 1000)
    state().updatePart('body', { material: 'glossy' }, 1100)
    state().updatePart('body', { color: 'blue' }, 1200)
    expect(state().past).toHaveLength(1)
    state().updatePart('body', { material: 'matte' }, 1300)
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().past).toHaveLength(0)
  })

  it('restores the oldest history entry when a reverted group had reached the capacity limit', () => {
    for (let index = 0; index < HISTORY_LIMIT; index++)
      state().updatePart('body', { color: index % 2 === 0 ? 'red' : 'olive' }, index * 1000)
    const previousHistory = state().past
    state().updatePart('body', { color: 'blue' }, 100_000)
    state().updatePart('body', { color: 'olive' }, 100_100)
    expect(state().past).toHaveLength(HISTORY_LIMIT)
    expect(state().past).toEqual(previousHistory)
    expect(state().past[0]).toEqual(DEFAULT_CONFIG)
  })
})
