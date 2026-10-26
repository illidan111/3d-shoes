import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { cloneConfig, DEFAULT_CONFIG, isShoeConfig } from '../config/parts'
import { PRESETS } from '../config/presets'
import { useConfigSync } from '../hooks/useConfigSync'
import { configurationKey, parseConfig } from '../lib/urlState'
import { HISTORY_LIMIT, useConfigStore } from '../stores/configStore'

const state = () => useConfigStore.getState()

beforeEach(() => {
  state().loadConfig(DEFAULT_CONFIG)
  state().selectPart('body')
  window.history.replaceState(null, '', '/')
})

describe('curated presets', () => {
  it('provides four distinct complete portable configurations', () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(['monochrome', 'sand', 'night', 'accent'])
    expect(new Set(PRESETS.map((preset) => configurationKey(preset.config))).size).toBe(4)
    for (const preset of PRESETS) {
      expect(isShoeConfig(preset.config)).toBe(true)
      expect(preset.name).not.toHaveLength(0)
      expect(parseConfig(configurationKey(preset.config))).toEqual(preset.config)
    }
  })
})

describe('A/B comparison', () => {
  it('does nothing before A is remembered', () => {
    const initial = state()
    state().toggleComparison()
    expect(state()).toBe(initial)
  })

  it('remembers an immutable detached A without a history entry', () => {
    state().rememberComparison()
    const saved = state().comparisonSnapshot
    expect(saved).toEqual(DEFAULT_CONFIG)
    expect(saved).not.toBe(state().config)
    expect(saved?.body).not.toBe(state().config.body)
    expect(Object.isFrozen(saved)).toBe(true)
    expect(Object.isFrozen(saved?.body)).toBe(true)
    expect(state().past).toHaveLength(0)
    state().updatePart('body', { color: 'red' })
    expect(saved?.body.color).toBe('blue')
  })

  it('previews A and returns to the exact B with one undo step per change', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[2].config)
    const b = cloneConfig(state().config)
    state().toggleComparison()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().comparisonDraft).toEqual(b)
    expect(state().comparisonDraft).not.toBe(b)
    expect(state().isComparing).toBe(true)
    expect(state().past).toHaveLength(2)
    state().toggleComparison()
    expect(state().config).toEqual(b)
    expect(state().comparisonDraft).toBeNull()
    expect(state().isComparing).toBe(false)
    expect(state().past).toHaveLength(3)
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
  })

  it('does not add duplicate history when A and B are identical', () => {
    state().rememberComparison()
    state().toggleComparison()
    expect(state().isComparing).toBe(true)
    expect(state().past).toHaveLength(0)
    state().toggleComparison()
    expect(state().isComparing).toBe(false)
    expect(state().past).toHaveLength(0)
  })

  it('edits visible A into a new B while retaining saved A and the old B in history', () => {
    state().rememberComparison()
    state().updatePart('body', { color: 'red' }, 1000)
    const oldB = cloneConfig(state().config)
    state().toggleComparison()
    state().updatePart('sole', { color: 'black' }, 1100)
    expect(state().isComparing).toBe(false)
    expect(state().comparisonDraft).toBeNull()
    expect(state().config.body.color).toBe('blue')
    expect(state().config.sole.color).toBe('black')
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
    state().undo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().isComparing).toBe(false)
    state().undo()
    expect(state().config).toEqual(oldB)
  })

  it('exits preview for a valid no-op edit without corrupting saved A or history', () => {
    state().rememberComparison()
    state().updatePart('body', { color: 'red' }, 1000)
    state().toggleComparison()
    state().updatePart('body', { color: 'blue' }, 1100)
    expect(state().isComparing).toBe(false)
    expect(state().comparisonDraft).toBeNull()
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
    expect(state().past).toHaveLength(2)
  })

  it('exits preview for undo and redo while restoring only visible configurations', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[1].config)
    state().toggleComparison()
    state().undo()
    expect(state().config).toEqual(PRESETS[1].config)
    expect(state().isComparing).toBe(false)
    expect(state().comparisonDraft).toBeNull()
    state().redo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().isComparing).toBe(false)
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
  })

  it('applies a preset from A as one step and preserves the comparison snapshot', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[1].config)
    state().toggleComparison()
    state().applyConfig(PRESETS[3].config)
    expect(state().isComparing).toBe(false)
    expect(state().past).toHaveLength(3)
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
    state().undo()
    expect(state().config).toEqual(DEFAULT_CONFIG)
    state().redo()
    expect(state().config).toEqual(PRESETS[3].config)
  })

  it('resets from A without overwriting saved A and makes that reset undoable', () => {
    state().applyConfig(PRESETS[1].config)
    state().rememberComparison()
    state().applyConfig(PRESETS[3].config)
    state().toggleComparison()
    state().resetConfig()
    expect(state().isComparing).toBe(false)
    expect(state().config).toEqual(DEFAULT_CONFIG)
    expect(state().comparisonSnapshot).toEqual(PRESETS[1].config)
    state().undo()
    expect(state().config).toEqual(PRESETS[1].config)
    expect(state().isComparing).toBe(false)
  })

  it('saves the visible A as the new reference and leaves preview mode', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[1].config)
    state().toggleComparison()
    const historyLength = state().past.length
    state().rememberComparison()
    expect(state().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
    expect(state().comparisonDraft).toBeNull()
    expect(state().isComparing).toBe(false)
    expect(state().past).toHaveLength(historyLength)
  })

  it('clears comparison when loading a different URL session', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[1].config)
    state().toggleComparison()
    state().loadConfig(PRESETS[3].config)
    expect(state().comparisonSnapshot).toBeNull()
    expect(state().comparisonDraft).toBeNull()
    expect(state().isComparing).toBe(false)
    expect(state().past).toHaveLength(0)
    expect(state().future).toHaveLength(0)
  })

  it('enforces the history cap across comparison changes', () => {
    state().rememberComparison()
    state().applyConfig(PRESETS[1].config)
    for (let index = 0; index < 70; index++) state().toggleComparison()
    expect(state().past).toHaveLength(HISTORY_LIMIT)
    expect(state().config).toEqual(PRESETS[1].config)
  })

  it('keeps the shared URL synchronized with the actual A or B currently displayed', () => {
    renderHook(useConfigSync)
    act(() => {
      state().rememberComparison()
      state().applyConfig(PRESETS[1].config)
    })
    expect(parseConfig(window.location.search)).toEqual(PRESETS[1].config)
    act(() => state().toggleComparison())
    expect(parseConfig(window.location.search)).toEqual(DEFAULT_CONFIG)
    act(() => state().toggleComparison())
    expect(parseConfig(window.location.search)).toEqual(PRESETS[1].config)
  })
})
