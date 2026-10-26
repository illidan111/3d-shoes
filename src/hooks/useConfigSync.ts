import { useEffect, useRef } from 'react'
import { configsEqual } from '../config/parts'
import { isEditableTarget } from '../lib/a11y'
import { parseConfig, updateConfigUrl } from '../lib/urlState'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

/** Mount once near the app root. Hydration happens before URL subscription. */
export function useConfigSync(): void {
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      useConfigStore.getState().loadConfig(parseConfig(window.location.search))
      hydrated.current = true
    }
    updateConfigUrl(useConfigStore.getState().config)
    const unsubscribe = useConfigStore.subscribe((state, previous) => {
      if (state.config !== previous.config) updateConfigUrl(state.config)
    })
    const onPopState = () => {
      const nextConfig = parseConfig(window.location.search)
      const state = useConfigStore.getState()
      // Hash and campaign navigation must not discard editing history or saved A.
      if (configsEqual(state.config, nextConfig)) return
      state.loadConfig(nextConfig)
      useUiStore.getState().activateScene()
      useUiStore.getState().announce('Конфигурация восстановлена из ссылки')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        !(event.metaKey || event.ctrlKey) ||
        (event.code !== 'KeyZ' && event.key.toLowerCase() !== 'z') ||
        (event.target instanceof Element && event.target.closest('dialog[open]') !== null) ||
        isEditableTarget(event.target)
      )
        return
      event.preventDefault()
      const state = useConfigStore.getState()
      if (event.shiftKey) {
        if (state.future.length === 0) return
        state.redo()
        useUiStore.getState().announce('Изменение повторено')
      } else {
        if (state.past.length === 0) return
        state.undo()
        useUiStore.getState().announce('Изменение отменено')
      }
    }
    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      unsubscribe()
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
