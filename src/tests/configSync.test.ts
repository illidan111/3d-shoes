import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config/parts'
import { useConfigSync } from '../hooks/useConfigSync'
import { parseConfig } from '../lib/urlState'
import { useConfigStore } from '../stores/configStore'

beforeEach(() => {
  useConfigStore.getState().loadConfig(DEFAULT_CONFIG)
  window.history.replaceState(null, '', '/')
})

describe('configuration URL and keyboard integration', () => {
  it('hydrates the shared configuration before writing to the URL', () => {
    window.history.replaceState(null, '', '/?body=red-metallic&campaign=shared')
    renderHook(useConfigSync)
    expect(useConfigStore.getState().config.body).toEqual({ color: 'red', material: 'metallic' })
    expect(parseConfig(window.location.search).body.color).toBe('red')
    expect(new URLSearchParams(window.location.search).get('campaign')).toBe('shared')
  })

  it('writes user edits and restores configuration on popstate', () => {
    renderHook(useConfigSync)
    act(() => useConfigStore.getState().updatePart('body', { color: 'olive' }))
    expect(parseConfig(window.location.search).body.color).toBe('olive')
    act(() => {
      window.history.replaceState(null, '', '/?body=navy-glossy')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(useConfigStore.getState().config.body).toEqual({ color: 'navy', material: 'glossy' })
    expect(useConfigStore.getState().past).toHaveLength(0)
  })

  it('supports keyboard undo and shift redo', () => {
    renderHook(useConfigSync)
    act(() => useConfigStore.getState().updatePart('body', { color: 'red' }))
    act(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, cancelable: true }),
      ),
    )
    expect(useConfigStore.getState().config.body.color).toBe('blue')
    act(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Z',
          code: 'KeyZ',
          metaKey: true,
          shiftKey: true,
          cancelable: true,
        }),
      ),
    )
    expect(useConfigStore.getState().config.body.color).toBe('red')
  })

  it('leaves keyboard undo in text fields to the browser', () => {
    renderHook(useConfigSync)
    act(() => useConfigStore.getState().updatePart('body', { color: 'red' }))
    const input = document.createElement('input')
    document.body.append(input)
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => input.dispatchEvent(event))
    expect(event.defaultPrevented).toBe(false)
    expect(useConfigStore.getState().config.body.color).toBe('red')
    input.remove()
  })

  it('cleans up subscriptions and event listeners when unmounted', () => {
    const { unmount } = renderHook(useConfigSync)
    const previousSearch = window.location.search
    unmount()
    act(() => useConfigStore.getState().updatePart('body', { color: 'red' }))
    expect(window.location.search).toBe(previousSearch)
    act(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true })),
    )
    expect(useConfigStore.getState().config.body.color).toBe('red')
  })
})
