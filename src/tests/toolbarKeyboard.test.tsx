import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Toolbar } from '../components/ui/Toolbar'
import { DEFAULT_CONFIG } from '../config/parts'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

beforeEach(() => {
  useConfigStore.getState().loadConfig(DEFAULT_CONFIG)
  useUiStore.setState({ viewRevision: 0, notice: '' })
})

const buttons = () => ({
  undo: screen.getByRole('button', { name: 'Отменить изменение' }),
  redo: screen.getByRole('button', { name: 'Повторить изменение' }),
  reset: screen.getByRole('button', { name: 'Сбросить вид' }),
})

function expectSingleTabStop(expected: HTMLElement) {
  const group = screen.getByRole('toolbar', { name: 'История и камера' })
  const stops = within(group)
    .getAllByRole('button')
    .filter((button) => button.tabIndex === 0)
  expect(stops).toEqual([expected])
  expect(expected).not.toBeDisabled()
}

describe('history toolbar keyboard navigation', () => {
  it('offers one tab stop and lets Tab and Shift+Tab leave the toolbar', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>До панели</button>
        <Toolbar />
        <button>После панели</button>
      </>,
    )
    const { reset } = buttons()
    expectSingleTabStop(reset)
    await user.tab()
    expect(screen.getByRole('button', { name: 'До панели' })).toHaveFocus()
    await user.tab()
    expect(reset).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'После панели' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(reset).toHaveFocus()
  })

  it('moves with arrows, Home and End, skips disabled buttons and never activates a command', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'red' })
    render(<Toolbar />)
    const { undo, redo, reset } = buttons()
    expect(redo).toBeDisabled()
    expectSingleTabStop(undo)
    await user.tab()
    expect(undo).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(reset).toHaveFocus()
    expectSingleTabStop(reset)
    await user.keyboard('{ArrowRight}')
    expect(undo).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(reset).toHaveFocus()
    await user.keyboard('{Home}')
    expect(undo).toHaveFocus()
    await user.keyboard('{End}')
    expect(reset).toHaveFocus()
    expect(useConfigStore.getState().config.body.color).toBe('red')
    expect(useConfigStore.getState().past).toHaveLength(1)
    expect(useUiStore.getState().viewRevision).toBe(0)
  })

  it('keeps focus available after the last undo and last redo disable their invoking buttons', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'red' })
    render(<Toolbar />)
    const { undo, redo } = buttons()
    await user.tab()
    expect(undo).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(undo).toBeDisabled()
    expect(redo).toHaveFocus()
    expectSingleTabStop(redo)
    expect(useConfigStore.getState().config.body.color).toBe('blue')
    await user.keyboard(' ')
    expect(redo).toBeDisabled()
    expect(undo).toHaveFocus()
    expectSingleTabStop(undo)
    expect(useConfigStore.getState().config.body.color).toBe('red')
  })

  it('recovers to reset when external history changes disable the focused command', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'red' })
    render(<Toolbar />)
    const { undo, reset } = buttons()
    await user.tab()
    expect(undo).toHaveFocus()
    act(() => useConfigStore.getState().loadConfig(DEFAULT_CONFIG))
    expect(reset).toHaveFocus()
    expectSingleTabStop(reset)
  })

  it('does not steal focus from another control when history changes', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'red' })
    render(
      <>
        <Toolbar />
        <button>Другая область</button>
      </>,
    )
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Другая область' }))
    act(() => useConfigStore.getState().loadConfig(DEFAULT_CONFIG))
    expect(screen.getByRole('button', { name: 'Другая область' })).toHaveFocus()
    expectSingleTabStop(buttons().reset)
  })

  it('leaves modified navigation keys and handled events to their owner', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'red' })
    render(<Toolbar />)
    const { undo } = buttons()
    await user.tab()
    for (const modifiers of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        ...modifiers,
      })
      fireEvent(undo, event)
      expect(event.defaultPrevented).toBe(false)
      expect(undo).toHaveFocus()
    }
    const handled = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    handled.preventDefault()
    fireEvent(undo, handled)
    expect(undo).toHaveFocus()
  })
})
