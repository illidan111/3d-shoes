import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { Icon } from './Icon'

type ToolbarAction = 'undo' | 'redo' | 'reset'

export function Toolbar() {
  const canUndo = useConfigStore((state) => state.past.length > 0)
  const canRedo = useConfigStore((state) => state.future.length > 0)
  const undo = useConfigStore((state) => state.undo)
  const redo = useConfigStore((state) => state.redo)
  const resetView = useUiStore((state) => state.resetView)
  const announce = useUiStore((state) => state.announce)
  const toolbar = useRef<HTMLDivElement>(null)
  const focusWithin = useRef(false)
  const [focusedAction, setFocusedAction] = useState<ToolbarAction | null>(null)
  const available: ToolbarAction[] = [
    ...(canUndo ? (['undo'] as const) : []),
    ...(canRedo ? (['redo'] as const) : []),
    'reset',
  ]
  const tabStop = focusedAction && available.includes(focusedAction) ? focusedAction : available[0]

  useLayoutEffect(() => {
    if (!focusedAction || !toolbar.current || !focusWithin.current) return
    const previous = toolbar.current.querySelector<HTMLButtonElement>(
      `[data-toolbar-action="${focusedAction}"]`,
    )
    // A history action can disable the button that invoked it. Chromium may
    // already have blurred that button to body; retain a usable toolbar focus.
    if (
      previous?.disabled &&
      (document.activeElement === previous || document.activeElement === document.body)
    ) {
      toolbar.current
        .querySelector<HTMLButtonElement>(`[data-toolbar-action="${tabStop}"]`)
        ?.focus()
    }
  }, [canUndo, canRedo, focusedAction, tabStop])

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    focusWithin.current = true
    const action = (event.target as HTMLElement).dataset.toolbarAction
    if (action === 'undo' || action === 'redo' || action === 'reset') setFocusedAction(action)
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))
      return
    // A disabled control can emit blur with no destination before the layout
    // effect restores focus. An ordinary departure must never be reversed.
    if (
      event.relatedTarget === null &&
      event.target instanceof HTMLButtonElement &&
      event.target.disabled
    )
      return
    focusWithin.current = false
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    )
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (current < 0 || buttons.length === 0) return
    event.preventDefault()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    // Toolbar arrows move focus only; Enter/Space still activate the command.
    buttons[next]?.focus()
  }

  return (
    <div
      ref={toolbar}
      className="view-toolbar"
      role="toolbar"
      aria-label="История и камера"
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="icon-button"
        aria-label="Отменить изменение"
        title="Отменить (Ctrl / ⌘ Z)"
        disabled={!canUndo}
        data-toolbar-action="undo"
        tabIndex={tabStop === 'undo' ? 0 : -1}
        onClick={() => {
          undo()
          announce('Изменение отменено')
        }}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Повторить изменение"
        title="Повторить (Ctrl / ⌘ Shift Z)"
        disabled={!canRedo}
        data-toolbar-action="redo"
        tabIndex={tabStop === 'redo' ? 0 : -1}
        onClick={() => {
          redo()
          announce('Изменение повторено')
        }}
      >
        <Icon name="redo" />
      </button>
      <span className="toolbar-divider" />
      <button
        type="button"
        className="reset-view"
        data-toolbar-action="reset"
        tabIndex={tabStop === 'reset' ? 0 : -1}
        onClick={resetView}
      >
        Сбросить вид
      </button>
    </div>
  )
}
