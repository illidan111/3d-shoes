import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config/parts'
import { useConfigSync } from '../hooks/useConfigSync'
import { useConfigStore } from '../stores/configStore'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  useConfigStore.getState().loadConfig(DEFAULT_CONFIG)
})

describe('history shortcuts in dialogs', () => {
  it.each([false, true])('leaves dialog keyboard input alone (redo=%s)', (redo) => {
    renderHook(useConfigSync)
    act(() => {
      useConfigStore.getState().updatePart('body', { color: 'red' })
      if (redo) useConfigStore.getState().undo()
    })
    const before = useConfigStore.getState().config
    const dialog = document.createElement('dialog')
    const button = document.createElement('button')
    button.textContent = 'Закрыть'
    dialog.open = true
    dialog.append(button)
    document.body.append(dialog)
    try {
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: redo,
        bubbles: true,
        cancelable: true,
      })
      act(() => button.dispatchEvent(event))
      expect(useConfigStore.getState().config).toEqual(before)
      expect(event.defaultPrevented).toBe(false)

      dialog.open = false
      act(() =>
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'z',
            code: 'KeyZ',
            ctrlKey: true,
            shiftKey: redo,
            cancelable: true,
          }),
        ),
      )
      expect(useConfigStore.getState().config.body.color).toBe(redo ? 'red' : 'blue')
    } finally {
      dialog.remove()
    }
  })
})
