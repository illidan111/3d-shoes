import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config/parts'
import { useConfigSync } from '../hooks/useConfigSync'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

const state = () => useConfigStore.getState()

function reset() {
  state().loadConfig(DEFAULT_CONFIG)
  useUiStore.setState({ ...useUiStore.getInitialState(), sceneActivated: false }, true)
  window.history.replaceState(null, '', '/')
}

beforeEach(reset)
afterEach(() => {
  cleanup()
  reset()
})

describe('navigation without a configuration change', () => {
  it('preserves undo, redo, and saved A when navigating between anchors', () => {
    renderHook(useConfigSync)
    act(() => {
      state().updatePart('body', { color: 'red' }, 1000)
      state().updatePart('body', { color: 'olive' }, 2000)
      state().undo()
      state().rememberComparison()
    })
    const beforeNavigation = state()
    act(() => {
      window.history.replaceState(null, '', `${window.location.search}#panel-title`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(state()).toBe(beforeNavigation)
    expect(state().past).toHaveLength(1)
    expect(state().future).toHaveLength(1)
    expect(state().comparisonSnapshot?.body.color).toBe('red')
  })

  it('preserves A preview and its return-to-B snapshot for unrelated query navigation', () => {
    renderHook(useConfigSync)
    act(() => {
      state().rememberComparison()
      state().updatePart('body', { color: 'red' })
      state().toggleComparison()
    })
    const beforeNavigation = state()
    act(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('campaign', 'launch')
      window.history.replaceState(null, '', url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(state()).toBe(beforeNavigation)
    expect(state().isComparing).toBe(true)
    act(() => state().toggleComparison())
    expect(state().config.body.color).toBe('red')
  })

  it('does not activate a mobile scene for navigation that still resolves to defaults', () => {
    renderHook(useConfigSync)
    act(() => state().rememberComparison())
    const snapshot = state().comparisonSnapshot
    act(() => {
      window.history.replaceState(null, '', '/?body=unsupported-matte#panel-title')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(state().comparisonSnapshot).toBe(snapshot)
    expect(useUiStore.getState().sceneActivated).toBe(false)
    expect(useUiStore.getState().notice).toBe('')
  })

  it('still loads a different configuration and clears previous editing history', () => {
    renderHook(useConfigSync)
    act(() => {
      state().rememberComparison()
      state().updatePart('body', { color: 'red' })
      window.history.replaceState(null, '', '/?body=navy-glossy')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(state().config.body).toEqual({ color: 'navy', material: 'glossy' })
    expect(state().past).toHaveLength(0)
    expect(state().future).toHaveLength(0)
    expect(state().comparisonSnapshot).toBeNull()
    expect(useUiStore.getState().sceneActivated).toBe(true)
    expect(useUiStore.getState().notice).toBe('Конфигурация восстановлена из ссылки')
  })
})
