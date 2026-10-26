import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG, getMaterial } from '../config/parts'
import { HelpDialog } from '../components/ui/HelpDialog'
import { Panel } from '../components/ui/Panel'
import { PartList } from '../components/ui/PartList'
import { Swatches } from '../components/ui/Swatches'
import { Toolbar } from '../components/ui/Toolbar'
import { parseConfig } from '../lib/urlState'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

beforeEach(() => {
  useConfigStore.getState().loadConfig(DEFAULT_CONFIG)
  useConfigStore.getState().selectPart('body')
  useUiStore.setState({
    sceneReady: false,
    sceneActivated: false,
    screenshotRequested: 0,
    notice: '',
    viewRevision: 0,
  })
  window.history.replaceState(null, '', '/')
  // jsdom does not implement the browser's modal top layer.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.open = false
    }),
  })
})

describe('part keyboard navigation', () => {
  it('keeps one tab stop and moves selection and focus together with arrow keys', async () => {
    const user = userEvent.setup()
    render(<PartList />)
    const group = screen.getByRole('radiogroup', { name: 'Часть кроссовка' })
    const body = within(group).getByRole('radio', { name: /Корпус/ })
    const sole = within(group).getByRole('radio', { name: /Подошва/ })
    expect(body).toHaveAttribute('tabindex', '0')
    expect(sole).toHaveAttribute('tabindex', '-1')

    await user.tab()
    expect(body).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(useUiStore.getState().sceneActivated).toBe(true)
    expect(sole).toHaveFocus()
    expect(sole).toHaveAttribute('aria-checked', 'true')
    expect(sole).toHaveAttribute('tabindex', '0')
    expect(body).toHaveAttribute('tabindex', '-1')
    expect(useConfigStore.getState().selectedPart).toBe('sole')
    expect(within(group).getAllByRole('radio', { checked: true })).toHaveLength(1)
  })

  it('wraps arrow navigation and supports Home and End', async () => {
    const user = userEvent.setup()
    render(<PartList />)
    await user.tab()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: /Язычок/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: /Корпус/ })).toHaveFocus()
    await user.keyboard('{End}')
    expect(useConfigStore.getState().selectedPart).toBe('tongue')
    await user.keyboard('{Home}')
    expect(useConfigStore.getState().selectedPart).toBe('body')
  })
})

describe('color and material controls', () => {
  it('changes only the selected part and updates checked states and announcements', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().selectPart('sole')
    render(<Swatches />)
    const colors = screen.getByRole('radiogroup', { name: 'Цвет' })
    const materials = screen.getByRole('radiogroup', { name: 'Материал' })

    await user.click(within(colors).getByRole('radio', { name: 'Бордовый' }))
    expect(useUiStore.getState().sceneActivated).toBe(true)
    act(() => useUiStore.setState({ sceneActivated: false }))
    await user.click(within(materials).getByRole('radio', { name: getMaterial('glossy').label }))
    expect(useUiStore.getState().sceneActivated).toBe(true)

    const config = useConfigStore.getState().config
    expect(config.sole).toEqual({ color: 'red', material: 'glossy' })
    expect(config.body).toEqual(DEFAULT_CONFIG.body)
    expect(config.lace).toEqual(DEFAULT_CONFIG.lace)
    expect(config.tongue).toEqual(DEFAULT_CONFIG.tongue)
    expect(within(colors).getByRole('radio', { name: 'Бордовый' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(colors).getByRole('radio', { name: 'Молочный' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(
      within(materials).getByRole('radio', { name: getMaterial('glossy').label }),
    ).toHaveAttribute('aria-checked', 'true')
    expect(within(colors).getAllByRole('radio', { checked: true })).toHaveLength(1)
    expect(useUiStore.getState().notice).toBe(
      `Подошва: бордовый, ${getMaterial('glossy').label.toLowerCase()}`,
    )
  })
})

describe('history toolbar', () => {
  it('disables undo and redo at their boundaries and restores the selected configuration', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)
    const undo = screen.getByRole('button', { name: 'Отменить изменение' })
    const redo = screen.getByRole('button', { name: 'Повторить изменение' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()

    act(() => useConfigStore.getState().updatePart('body', { color: 'red' }, 1000))
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
    await user.click(undo)
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG)
    expect(undo).toBeDisabled()
    expect(redo).toBeEnabled()
    await user.click(redo)
    expect(useConfigStore.getState().config.body.color).toBe('red')
    expect(undo).toBeEnabled()
    expect(redo).toBeDisabled()
  })

  it('resets the view without changing the shoe or history', async () => {
    const user = userEvent.setup()
    useConfigStore.getState().updatePart('body', { color: 'olive' })
    render(<Toolbar />)
    await user.click(screen.getByRole('button', { name: 'Сбросить вид' }))
    expect(useUiStore.getState().viewRevision).toBe(1)
    expect(useUiStore.getState().sceneActivated).toBe(true)
    expect(useConfigStore.getState().config.body.color).toBe('olive')
    expect(useConfigStore.getState().past).toHaveLength(1)
  })
})

describe('help dialog', () => {
  it('opens a labelled dialog and closes through the accessible close button', async () => {
    const user = userEvent.setup()
    render(<HelpDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Как это работает/ }))
    const dialog = screen.getByRole('dialog', { name: 'Твоя пара за минуту' })
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByText(/Ctrl \/ ⌘ Z отменяет изменение/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть инструкцию' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('export and sharing', () => {
  it('allows PNG export only when the scene is ready', async () => {
    const user = userEvent.setup()
    render(<Panel />)
    const download = screen.getByRole('button', { name: /Скачать PNG/ })
    expect(download).toBeDisabled()
    await user.click(download)
    expect(useUiStore.getState().screenshotRequested).toBe(0)
    act(() => useUiStore.getState().setSceneReady(true))
    expect(download).toBeEnabled()
    await user.click(download)
    expect(useUiStore.getState().screenshotRequested).toBe(1)
  })

  it('copies a current configuration link and announces success', async () => {
    const user = userEvent.setup()
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    useConfigStore.getState().updatePart('body', { color: 'olive', material: 'metallic' })
    render(<Panel />)
    await user.click(screen.getByRole('button', { name: 'Поделиться' }))
    expect(clipboard).toHaveBeenCalledWith(window.location.href)
    expect(parseConfig(window.location.search).body).toEqual({
      color: 'olive',
      material: 'metallic',
    })
    expect(useUiStore.getState().notice).toMatch(/Ссылка скопирована/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('provides a selected readonly share link when clipboard permission is denied', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Denied', 'NotAllowedError'),
    )
    window.history.replaceState(null, '', '/?campaign=launch#customize')
    useConfigStore.getState().updatePart('tongue', { color: 'rose', material: 'glossy' })
    render(<Panel />)
    await user.click(screen.getByRole('button', { name: 'Поделиться' }))
    const dialog = screen.getByRole('dialog', { name: 'Твоя конфигурация' })
    const input = within(dialog).getByRole<HTMLInputElement>('textbox', {
      name: 'Ссылка на конфигурацию',
    })
    expect(input).toHaveValue(window.location.href)
    expect(input).toHaveAttribute('readonly')
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
    expect(new URL(input.value).searchParams.get('campaign')).toBe('launch')
    expect(new URL(input.value).hash).toBe('#customize')
    expect(parseConfig(new URL(input.value).search).tongue).toEqual({
      color: 'rose',
      material: 'glossy',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Готово' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
